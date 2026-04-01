use std::path::Path;

use crate::{error::Result, models::note::Note};

pub fn load(data_dir: &Path) -> Result<Vec<Note>> {
    let path = data_dir.join("notes.json");
    if !path.exists() {
        return Ok(Vec::new());
    }
    let bytes = std::fs::read(&path)?;
    let notes: Vec<Note> = serde_json::from_slice(&bytes)?;
    Ok(notes)
}

pub fn save(data_dir: &Path, notes: &[Note]) -> Result<()> {
    let path = data_dir.join("notes.json");
    let tmp_path = data_dir.join("notes.json.tmp");
    let json = serde_json::to_vec_pretty(notes)?;
    std::fs::write(&tmp_path, &json)?;
    std::fs::rename(&tmp_path, &path)?;
    Ok(())
}
