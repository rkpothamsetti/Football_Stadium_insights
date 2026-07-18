import time
from typing import List, Dict, Any, Optional
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception
from app.core.config import settings
from app.core.logging import logger

# In-memory query-response cache for fallback degradation
QUERY_CACHE: Dict[str, Dict[str, Any]] = {}

# Flag for simulating 429 Rate Limits in tests
SIMULATE_429: bool = False
SIMULATE_429_COUNT: int = 0

class GeminiAPIError(Exception):
    """Custom exception simulating Gemini API failure (e.g. 429 Rate Limit)"""
    pass

def should_retry_gemini(exception: Exception) -> bool:
    """Retry on Gemini API failures or simulated 429 exceptions"""
    return isinstance(exception, GeminiAPIError)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.1, min=0.1, max=1),
    retry=retry_if_exception(should_retry_gemini),
    reraise=True
)
def call_gemini_api_with_retry(prompt: str) -> Dict[str, Any]:
    global SIMULATE_429_COUNT
    
    # Simulate a rate limit / 429 quota exception if flag is active
    if SIMULATE_429:
        SIMULATE_429_COUNT += 1
        logger.warning(f"[Gemini Service] Simulating API 429 Rate Limit (Attempt #{SIMULATE_429_COUNT})")
        raise GeminiAPIError("Simulated 429 Rate Limit exceeded.")

    # Live Gemini API execution (utilizing google-generativeai)
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY.strip())
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Formulate structured prompt expecting JSON response
        structured_prompt = f"""
        You are the Master Orchestrator for the Stadium Operating System.
        Route the user request: "{prompt}" to the correct sub-agent.
        
        Return a JSON object conforming exactly to this schema:
        {{
            "content": "Your user facing response text",
            "suggested_actions": [
                {{
                    "type": "navigate|order_food|play_audio|sos|update_ui",
                    "payload": {{}}
                }}
            ],
            "updated_context": {{}},
            "next_agent_id": "master|fan|security|vendor|operations|transportation|accessibility"
        }}
        """
        response = model.generate_content(
            structured_prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        import json
        clean_text = response.text.strip()
        if clean_text.startswith("```"):
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            else:
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            clean_text = clean_text.strip()
        result = json.loads(clean_text)
        return result
    except Exception as live_err:
        logger.error(f"[Gemini Service] Live API exception: {live_err}")
        raise GeminiAPIError(f"Gemini API failure: {str(live_err)}")

def generate_stadium_response(prompt: str) -> Dict[str, Any]:
    """
    Orchestrator entry point executing the API retry/cache fallback pipeline.
    """
    try:
        # Attempt standard API call with retries
        response = call_gemini_api_with_retry(prompt)
        
        # Save to cache if call was successful
        lowered_prompt = prompt.lower()
        QUERY_CACHE[lowered_prompt] = response
        return response
        
    except GeminiAPIError as err:
        logger.error(f"[Gemini Service] Retry pipeline exhausted. Failing over. Error: {err}")
        
        # Degradation: Try local cache hit
        lowered_prompt = prompt.lower()
        for cached_key, cached_resp in QUERY_CACHE.items():
            if cached_key in lowered_prompt or lowered_prompt in cached_key:
                logger.info(f"[Gemini Service] Cache Hit: Serving stale cached response for '{cached_key}'")
                degraded_resp = cached_resp.copy()
                degraded_resp["content"] = (
                    "[Offline/Cache Mode] " + degraded_resp["content"]
                )
                return degraded_resp
                
        # Cache Miss: Throw error
        logger.critical("[Gemini Service] Cache Miss and API unavailable. Throwing exception.")
        raise err

