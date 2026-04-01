use std::path::Path;

use crate::{error::Result, models::settings::Settings};

pub fn load(data_dir: &Path) -> Result<Settings> {
    let path = data_dir.join("settings.json");
    if !path.exists() {
        return Ok(Settings::default());
    }
    let bytes = std::fs::read(&path)?;
    let settings: Settings = serde_json::from_slice(&bytes)?;
    Ok(settings)
}

pub fn save(data_dir: &Path, settings: &Settings) -> Result<()> {
    let path = data_dir.join("settings.json");
    let tmp_path = data_dir.join("settings.json.tmp");
    let json = serde_json::to_vec_pretty(settings)?;
    std::fs::write(&tmp_path, &json)?;
    std::fs::rename(&tmp_path, &path)?;
    Ok(())
}
