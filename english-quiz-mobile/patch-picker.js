/**
 * Post-install patch for @react-native-picker/picker
 * Fixes Metro bundler PickerIOS resolution issue on Android
 */
const fs = require("fs");
const path = require("path");

const pickerIndexPath = path.join(__dirname, "node_modules", "@react-native-picker", "picker", "js", "index.js");

try {
  if (fs.existsSync(pickerIndexPath)) {
    let content = fs.readFileSync(pickerIndexPath, "utf8");

    // Only apply patch if PickerIOS export still exists
    if (content.includes("export {default as PickerIOS}")) {
      content = content.replace(
        "export {default as PickerIOS} from './PickerIOS';",
        "// Removed PickerIOS export to fix Metro bundler issue on Android\n// PickerIOS is still accessible via Picker component on iOS",
      );

      fs.writeFileSync(pickerIndexPath, content, "utf8");
      console.log("✓ Patched @react-native-picker/picker - PickerIOS export removed");
    }
  }
} catch (error) {
  console.warn("⚠ Could not apply @react-native-picker/picker patch:", error.message);
  // Non-fatal, app should still work
}
