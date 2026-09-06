import os
import re
import json
import logging
import httpx
from typing import Dict, Any, Optional

logger = logging.getLogger("insight_ai.gemini")

class GeminiClient:
    """
    Google Gemini Client for InsightAI.
    Direct REST integration using httpx with zero external SDK dependency overhead.
    Compatible with Google AI Studio API Keys.
    """
    def __init__(
        self,
        api_key: Optional[str] = None,
        primary_model: str = "gemini-1.5-flash",
        fallback_model: str = "gemini-2.0-flash"
    ):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
        self.primary_model = primary_model
        self.fallback_model = fallback_model
        self.timeout = 20.0
        self.client = httpx.Client(
            timeout=self.timeout,
            limits=httpx.Limits(max_keepalive_connections=15, max_connections=30)
        )

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 10)

    def set_api_key(self, key: str):
        self.api_key = key.strip()
        logger.info("Gemini API key updated in runtime client.")

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extract valid JSON from LLM response text, stripping markdown code blocks."""
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
        system_instruction: Optional[str] = None,
        model: Optional[str] = None
    ) -> str:
        """Call Google Generative Language API generateContent endpoint."""
        if not self.is_configured():
            raise RuntimeError("Google Gemini API Key is not configured.")

        target_model = model or self.primary_model
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{target_model}:generateContent?key={self.api_key}"

        contents = []
        if system_instruction:
            contents.append({
                "role": "user",
                "parts": [{"text": f"System Context / Instructions:\n{system_instruction}\n\nPlease follow these instructions strictly."}]
            })
            contents.append({
                "role": "model",
                "parts": [{"text": "Understood. I will act strictly according to these enterprise analytics and reasoning instructions."}]
            })

        contents.append({
            "role": "user",
            "parts": [{"text": prompt}]
        })

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.1,
                "topP": 0.95,
                "maxOutputTokens": 800,
            }
        }

        try:
            resp = self.client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    parts = candidates[0]["content"].get("parts", [])
                    if parts and "text" in parts[0]:
                        return parts[0]["text"].strip()
                raise RuntimeError("Gemini returned empty candidate content.")
            else:
                logger.warning(f"Gemini {target_model} returned status {resp.status_code}: {resp.text}")
                if target_model != self.fallback_model:
                    fallback_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.fallback_model}:generateContent?key={self.api_key}"
                    resp_fb = self.client.post(fallback_url, json=payload)
                    if resp_fb.status_code == 200:
                        data = resp_fb.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts and "text" in parts[0]:
                                return parts[0]["text"].strip()
                raise RuntimeError(f"Gemini API Error ({resp.status_code}): {resp.text}")
        except Exception as e:
            logger.error(f"Gemini inference failure: {e}")
            raise

    def generate_structured_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate structured JSON response with extraction."""
        raw_text = self.generate_chat_completion(
            prompt=prompt,
            system_instruction=system_instruction
        )
        try:
            return self._extract_json(raw_text)
        except Exception as e:
            logger.error(f"Failed to parse JSON from Gemini: {raw_text}")
            raise ValueError(f"Gemini output was not valid JSON: {str(e)}")

# Singleton instance
gemini_client = GeminiClient()
