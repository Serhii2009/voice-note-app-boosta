use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    /// Always "Text {N}" — the sequential auto-generated title
    pub auto_title: String,
    /// User-edited title, or null if never changed
    pub user_title: Option<String>,
    pub transcription: String,
    pub enhanced_text: Option<String>,
    pub created_at: DateTime<Utc>,
}
