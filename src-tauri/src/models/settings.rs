use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default)]
    pub gemini_api_key: String,
    #[serde(default = "default_model")]
    pub model_name: String,
    /// Persistent counter for "Text N" auto-titles; never decrements
    #[serde(default)]
    pub note_counter: u64,
}

fn default_model() -> String {
    "gemini-2.5-pro".to_string()
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            gemini_api_key: String::new(),
            model_name: default_model(),
            note_counter: 0,
        }
    }
}
