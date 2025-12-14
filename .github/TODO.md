# Sins of a Solar Empire - VS Code Extension

## Features
The extension currently supports these features.

### **Workspace Management**
* **Workspace Indexing:** Scans your entire workspace to link assets and definitions dynamically.
* Multi-root workspace support.

### 🔍 Intelligent Validation
* **Schema Validation:** Automatically validates game data files against the official Sins 2 JSON schemas.
* **Extended Schemas:** Includes a built-in patching system that fixes known discrepancies and deviations between the official schema and the vanilla game files.

### 🚀 Navigation & Productivity
* **Go-to-Definition:** Jump to the source file of a referenced entity. Ctrl+Click (or F12) on entity references to instantly jump to their source file.

### 🎨 Rich Previews
* **Documentation Hovers**: Hover over fields to see descriptions and documentation of what data does and how to use it.
* **Localization Hovers**: Hover over a localization key to see its translated text values from all known `.localized_text` files.
* **Texture Previews**: Hover over a texture reference to see a preview image directly in the editor (currently supports `.png`).


## Planned Features
These features and improvements are planned for future updates.

* **Referential Integrity Diagnostics**
    * Report errors for broken references (e.g., referencing a buff that does not exist).
* **Hot-Reloading (File Watcher)**
    * Update caches (Index, Localization, Textures) incrementally when files are created, changed, or deleted.
* **Performance**
    * Implement parallel file scanning in `WorkspaceManager`.
* **Auto-Completion (IntelliSense)**
    * Context-aware suggestions for texture keys, localized string keys, and entity references in JSON properties.
* **DDS Texture Support**
    * Add support for Direct Draw Surface (`.dds`) texture hover previews.
* **Color Tools**
    * Implement Color Picker for `.named_colors` and hex codes.
