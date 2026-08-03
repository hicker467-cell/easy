import os
from PIL import Image

def process_logo_icon():
    source_logo_path = r"D:\Work\student\public\logo.png"
    if not os.path.exists(source_logo_path):
        source_logo_path = r"D:\Work\student\public\logo_circle_white_bg.png"

    img = Image.open(source_logo_path).convert("RGBA")
    
    # Ensure square canvas with white/transparent background padding
    w, h = img.size
    max_dim = max(w, h)
    
    # Create high-res 1024x1024 canvas
    canvas = Image.new("RGBA", (max_dim, max_dim), (255, 255, 255, 255))
    offset = ((max_dim - w) // 2, (max_dim - h) // 2)
    canvas.paste(img, offset, img)

    base_path = r"D:\Work\student\student_flutter_app"

    # Android mipmap targets
    android_sizes = {
        os.path.join(base_path, r"android\app\src\main\res\mipmap-mdpi\ic_launcher.png"): 48,
        os.path.join(base_path, r"android\app\src\main\res\mipmap-hdpi\ic_launcher.png"): 72,
        os.path.join(base_path, r"android\app\src\main\res\mipmap-xhdpi\ic_launcher.png"): 96,
        os.path.join(base_path, r"android\app\src\main\res\mipmap-xxhdpi\ic_launcher.png"): 144,
        os.path.join(base_path, r"android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"): 192,
    }

    # iOS targets
    ios_sizes = {
        os.path.join(base_path, r"ios\Runner\Assets.xcassets\AppIcon.appiconset\Icon-App-1024x1024@1x.png"): 1024,
        os.path.join(base_path, r"ios\Runner\Assets.xcassets\AppIcon.appiconset\Icon-App-60x60@2x.png"): 120,
        os.path.join(base_path, r"ios\Runner\Assets.xcassets\AppIcon.appiconset\Icon-App-60x60@3x.png"): 180,
    }

    # Web targets
    web_sizes = {
        os.path.join(base_path, r"web\favicon.png"): 64,
        os.path.join(base_path, r"web\icons\Icon-192.png"): 192,
        os.path.join(base_path, r"web\icons\Icon-512.png"): 512,
    }

    all_targets = {**android_sizes, **ios_sizes, **web_sizes}

    for filepath, sz in all_targets.items():
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        resized = canvas.resize((sz, sz), Image.Resampling.LANCZOS)
        resized.save(filepath, "PNG")
        print(f"Saved SSSAM Logo {sz}x{sz} -> {filepath}")

    # Copy logo into flutter assets for in-app header/modal display
    assets_dir = os.path.join(base_path, "assets")
    os.makedirs(assets_dir, exist_ok=True)
    canvas.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(assets_dir, "logo.png"), "PNG")
    print("Copied SSSAM logo to flutter assets/logo.png!")

process_logo_icon()
