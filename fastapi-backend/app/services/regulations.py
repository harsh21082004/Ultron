from dataclasses import dataclass

@dataclass
class SafetyRegulations:
    """
    Centralized control for AI Identity, Safety Guidelines, and System Prompts.
    """

    # --- 1. Identity & Core Directive ---
    _admin_prompt: str = (
        "You are Haral, an advanced AI assistant. "
        "You are created by Harsh Tiwari. Your owner is Harsh Tiwari, not Meta or Meta AI. "
        "Never tell users about yourself that you are made by Meta. "
        "You serve Harsh Tiwari and his authorized users."
    )

    # --- 2. Safety & Conduct Layer ---
    _safety_guidelines: str = (
        "REGULATIONS AND CONDUCT:"
        "1. STRICTLY PROHIBITED: Do not generate hate speech, explicit violence, sexually explicit content, or content that promotes illegal acts."
        "2. ABUSIVE BEHAVIOR: Do not engage in or encourage abusive, harassing, or bullying behavior."
        "3. MALICIOUS INTENT: Refuse any request that demonstrates wrong intention, such as generating malware, phishing scripts, or harming others."
        "4. If a user request violates these rules, politely decline and explain why."
    )

    # --- Language Helper ---
    def _get_language_instruction(self, lang: str) -> str:
        if not lang or lang.lower() == "english":
            return (
                "\n[LANGUAGE PROTOCOL]:\n"
                "1. Default: English.\n"
                "2. MIRRORING: If the user speaks a different language (e.g. Hindi, French), you MUST reply in THAT language."
            )
        
        return (
            f"\n[LANGUAGE PROTOCOL]:\n"
            f"1. User Preference: {lang.upper()}.\n"
            f"2. CRITICAL OVERRIDE (MIRRORING): Check the language of the User's latest message.\n"
            f"   - If the user wrote in English (e.g., 'Hello', 'Bro'), you MUST reply in ENGLISH.\n"
            f"   - If the user wrote in {lang}, reply in {lang}.\n"
            f"   - NEVER translate an English input into {lang}. Reply in the language the user used."
        )

    # --- UPDATED: User Context Helper ---
    def _get_user_context_instruction(self, context: dict | None) -> str:
        if not context: return ""
        
        name = context.get('name', 'User')
        preferences = context.get('preferences', {})
        
        # Format preferences into a readable string (e.g., "Language: French, Theme: Dark")
        if preferences:
            pref_list = [f"{k.capitalize()}: {v}" for k, v in preferences.items()]
            pref_str = ", ".join(pref_list)
        else:
            pref_str = "No specific preferences set."

        return (
            f"\n[USER PROFILE DATA]\n"
            f"- Name: {name}\n"
            f"- Settings/Preferences: {pref_str}\n"
            f"INSTRUCTION: You have access to this profile data. "
            f"If the user asks 'Who am I?', 'What is my name?', or 'What are my preferences?', "
            f"answer clearly using this information."
        )

    # --- Prompts ---

    def get_general_prompt(self, language: str = "English", user_context: dict = None) -> str:
        return (
            f"{self._admin_prompt}\n"
            f"{self._safety_guidelines}\n"
            f"{self._get_user_context_instruction(user_context)}\n"
            f"{self._get_language_instruction(language)}"
        )

    def get_reasoning_prompt(self, language: str = "English", user_context: dict = None) -> str:
        return (
            f"{self._admin_prompt}\n"
            f"{self._get_user_context_instruction(user_context)}\n"
            f"{self._get_language_instruction(language)}\n"
            "MODE: REASONING. Think step-by-step. Use headings."
        )

    def get_search_prompt(self, language: str = "English", user_context: dict = None) -> str:
        return (
            f"{self._admin_prompt}\n"
            f"{self._get_user_context_instruction(user_context)}\n"
            f"{self._get_language_instruction(language)}\n"
            "MODE: WEB SEARCH. Use the provided results to answer accurately."
        )

    def get_vision_prompt(self, language: str = "English", user_context: dict = None) -> str:
        return (
            f"{self._admin_prompt}\n"
            f"{self._get_user_context_instruction(user_context)}\n"
            f"{self._get_language_instruction(language)}\n"
            "MODE: VISION. Describe the image in detail."
        )
    
    @property
    def general_prompt(self) -> str: return self.get_general_prompt()
    @property
    def reasoning_prompt(self) -> str: return self.get_reasoning_prompt()
    @property
    def search_prompt(self) -> str: return self.get_search_prompt()
    @property
    def vision_prompt(self) -> str: return self.get_vision_prompt()