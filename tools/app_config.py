"""The one place a new app fills in its identity.

Every harness in `tools/` imports from here rather than hardcoding a bundle id, so
adopting the fleet-testing rig in a new app is one file to edit instead of fifteen.

Fill these in when you clone the template. The device ids come from:

    xcrun devicectl list devices          # Apple: iPhone, iPad, Apple TV
    adb devices -l                        # Android
    xcrun simctl list devices available   # simulators

Leave a device as None and the harnesses skip it and SAY they skipped it — a fleet
entry that silently does nothing is the failure this whole rig exists to prevent.
"""

# --- App identity -------------------------------------------------------------
APPLE_BUNDLE_ID = "com.example.appname"           # iOS / iPadOS / tvOS / macOS
APPLE_APP_NAME = "AppName"                        # the .app / scheme name
ANDROID_PACKAGE = "com.example.appname"
ANDROID_PACKAGE_DEBUG = "com.example.appname.debug"
ANDROID_MAIN_ACTIVITY = "com.example.appname.MainActivity"
WINDOWS_PROCESS = "AppName"                       # the .exe, minus the extension
WEB_URL = "http://localhost:8080"

# --- The bench ----------------------------------------------------------------
# Real hardware, by udid/serial. None = not on this bench.
DEVICES = {
    "iphone":  None,      # devicectl udid
    "ipad":    None,      # devicectl udid
    "appletv": None,      # devicectl udid (paired over the network)
    "android": None,      # adb serial
    "mac":     "local",   # the Mac this runs on
    "windows": None,      # hostname or IP for SSH; see winbox.py
    "web":     "local",   # a local Chrome driven over CDP
}

# --- Env hooks ----------------------------------------------------------------
# The env vars / intent extras your app reads to open a screen directly. These are
# what make surfaces reachable; see docs/AUTONOMOUS-FLEET-TESTING.md section 3.
#
# They must be no-ops in production, and on Android they must be BuildConfig.DEBUG
# gated AND you must install the DEBUG build — against a release build they silently
# do nothing, every scenario lands on Home, and every scenario passes.
HOOK_SKIP_ONBOARD = "APP_SKIP_ONBOARD"
HOOK_START_TAB = "APP_START_TAB"
HOOK_START_ITEM = "APP_START_ITEM"

# --- Grading ------------------------------------------------------------------
# CALIBRATE these against a real capture from the real device. Never copy a
# threshold from another project: a 0.010 clip threshold ported between two apps
# reported three correctly-rendered headings as clipped on every frame.
CLIP_X = 0.005                 # normalised x below which text is "clipped"
MIN_OCR_LINES = 4              # fewer than this = the frame is unreadable

# The app's own on-screen VOCABULARY — words that prove the right app is showing a
# real screen. The harness grades "is my app on the glass" by matching this, so it
# must be words your UI actually renders (tab titles, primary actions), not the app's
# name. Getting this wrong makes every scenario fail with "wrong app/screen".
APP_ANCHOR_RX = r"Home|Settings|Search"          # FILL IN

# Text that means the app is broken, whatever else is on screen.
FORBIDDEN = (r"No results|Couldn.t load|Something went wrong|"
             r"failed to|\berror\b|couldn.t be")
