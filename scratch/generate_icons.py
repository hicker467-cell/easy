import os
from PIL import Image, ImageDraw, ImageFont

def draw_apple_geotrack_icon(size):
    # High-res canvas
    canvas_size = max(size, 1024)
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Background Apple Rounded Squircle
    margin = int(canvas_size * 0.04)
    rect = [margin, margin, canvas_size - margin, canvas_size - margin]
    radius = int(canvas_size * 0.22)

    # Draw emerald gradient effect
    for i in range(radius):
        color = (0, 199 - int(i * 0.05), 190 - int(i * 0.05), 255)
    
    draw.rounded_rectangle(rect, radius=radius, fill=(0, 199, 190, 255))

    # Add soft inner glow / radial circle
    center = (canvas_size // 2, canvas_size // 2)
    glow_r = int(canvas_size * 0.38)
    draw.ellipse(
        [center[0] - glow_r, center[1] - glow_r, center[0] + glow_r, center[1] + glow_r],
        fill=(255, 255, 255, 30)
    )

    # 2. Draw GPS Fingerprint Emblem in pure crisp white
    # Concentric arches for Fingerprint
    stroke_w = int(canvas_size * 0.045)
    for r in [int(canvas_size * 0.12), int(canvas_size * 0.20), int(canvas_size * 0.28)]:
        draw.arc(
            [center[0] - r, center[1] - r + int(canvas_size * 0.02), center[0] + r, center[1] + r + int(canvas_size * 0.02)],
            start=200, end=340, fill=(255, 255, 255, 240), width=stroke_w
        )

    # Center GPS location pin head
    pin_r = int(canvas_size * 0.08)
    draw.ellipse(
        [center[0] - pin_r, center[1] - pin_r - int(canvas_size * 0.05), center[0] + pin_r, center[1] + pin_r - int(canvas_size * 0.05)],
        fill=(255, 255, 255, 255)
    )
    # Pin center cutout
    cut_r = int(pin_r * 0.45)
    draw.ellipse(
        [center[0] - cut_r, center[1] - cut_r - int(canvas_size * 0.05), center[0] + cut_r, center[1] + cut_r - int(canvas_size * 0.05)],
        fill=(0, 199, 190, 255)
    )

    # Resize to requested size with high quality Lanczos antialiasing
    if size != canvas_size:
        img = img.resize((size, size), Image.Resampling.LANCZOS)
    return img

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
    icon_img = draw_apple_geotrack_icon(sz)
    icon_img.save(filepath, "PNG")
    print(f"Generated {sz}x{sz} icon -> {filepath}")

print("ALL APP ICONS GENERATED SUCCESSFULLY!")
