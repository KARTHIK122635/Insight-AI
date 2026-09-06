import os
import re
import json
import logging
import hashlib
import httpx
from typing import Dict, Any, List, Optional
from backend.ai.prompts import ANALYTICS_SYSTEM_PROMPT

logger = logging.getLogger("insight_ai.qwen")

class QwenClient:
    def __init__(
        self,
        token: Optional[str] = None,
        primary_model: Optional[str] = None,
        fallback_model: Optional[str] = None
    ):
        self.token = token or os.getenv("HF_TOKEN", "")
        self.router_url = os.getenv("HF_ROUTER_URL", "https://router.huggingface.co/v1/chat/completions")
        self.primary_model = primary_model or os.getenv("PRIMARY_MODEL", "Qwen/Qwen2.5-Coder-32B-Instruct")
        self.fallback_model = fallback_model or os.getenv("FALLBACK_MODEL", "meta-llama/Llama-3.3-70B-Instruct")
        self.timeout = 18.0
        self.auth_failed = False
        
        # Persistent HTTP client with connection pooling to eliminate TLS handshake latency
        self.client = httpx.Client(
            timeout=self.timeout,
            limits=httpx.Limits(max_keepalive_connections=25, max_connections=50)
        )
        # In-memory prompt response cache
        self.cache: Dict[str, str] = {}

    def is_configured(self) -> bool:
        return bool(self.token and len(self.token.strip()) > 10 and not self.token.startswith("hf_placeholder") and not self.auth_failed)

    def set_token(self, token: str):
        self.token = token.strip()
        self.auth_failed = False
        self.cache.clear()

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extract valid JSON from LLM response text, stripping any markdown wrappers."""
        text = text.strip()
        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except Exception:
                pass
        
        brace_match = re.search(r"(\{.*\})", text, re.DOTALL)
        if brace_match:
            try:
                return json.loads(brace_match.group(1))
            except Exception:
                pass

        return json.loads(text)

    def generate_chat_completion(
        self,
        prompt: str,
        system_prompt: str = ANALYTICS_SYSTEM_PROMPT,
        temperature: float = 0.1,
        max_tokens: int = 350,
        model: Optional[str] = None
    ) -> str:
        """Call Hugging Face Router with connection pooling, caching, and model fallback."""
        target_model = model or self.primary_model
        
        # Check cache
        cache_key = hashlib.md5(f"{target_model}:{prompt}".encode("utf-8")).hexdigest()
        if cache_key in self.cache:
            return self.cache[cache_key]

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "x-wait-for-model": "true"
        }

        payload = {
            "model": target_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        try:
            resp = self.client.post(self.router_url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                self.cache[cache_key] = content
                return content
            else:
                logger.warning(f"Primary model {target_model} returned {resp.status_code}: {resp.text}")
                if resp.status_code in [401, 403]:
                    self.auth_failed = True
                if target_model != self.fallback_model:
                    logger.info(f"Retrying with fallback model {self.fallback_model}")
                    payload["model"] = self.fallback_model
                    resp_fallback = self.client.post(self.router_url, headers=headers, json=payload)
                    if resp_fallback.status_code == 200:
                        content = resp_fallback.json()["choices"][0]["message"]["content"]
                        self.cache[cache_key] = content
                        return content
                
                raise RuntimeError(f"HF Router Error ({resp.status_code}): {resp.text}")
        except Exception as e:
            logger.error(f"Inference error: {e}")
            raise

    def generate_structured_json(
        self,
        prompt: str,
        system_prompt: str = ANALYTICS_SYSTEM_PROMPT,
        temperature: float = 0.1,
        max_tokens: int = 400
    ) -> Dict[str, Any]:
        """Generate and parse structured JSON with validation."""
        raw_text = self.generate_chat_completion(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens
        )
        try:
            return self._extract_json(raw_text)
        except Exception as e:
            logger.error(f"Failed to parse JSON from LLM: {raw_text}")
            raise ValueError(f"Model did not return valid JSON: {str(e)}")

# Singleton instance
qwen_client = QwenClient()
