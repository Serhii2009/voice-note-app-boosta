use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Gemini API error: {0}")]
    GeminiApi(String),

    #[error("Invalid API key — check Settings")]
    InvalidApiKey,

    #[error("No API key configured — open Settings")]
    NoApiKey,

    #[error("Processing previous recording — please wait")]
    AlreadyProcessing,

    #[error("No monitor found")]
    NoMonitor,

    #[error("Window error: {0}")]
    Window(String),
}

// Required for Tauri to serialize errors to the frontend as rejected Promise strings
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
