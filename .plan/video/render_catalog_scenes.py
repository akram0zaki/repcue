
# render_catalog_scenes.py
# Renders all scenes in the currently opened .blend (one per exercise).
# Each scene name is treated as the exercise_id.
#
# Example:
# blender -b repcue_exercises_catalog.blend -P render_catalog_scenes.py -- \
#   --out "/assets/videos" --fps 30 --seconds 2.2 --static_seconds 10 \
#   --static_ids plank side-plank wall-sit downward-dog child-pose single-leg-stand tree-pose warrior-3 forward-fold finger-roll
import bpy, sys, os, argparse

def parse_argv():
    argv = sys.argv
    argv = argv[argv.index("--")+1:] if "--" in argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True, help="Output directory (will create subfolders per exercise_id)")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--seconds", type=float, default=2.2, help="Per-rep loop length")
    ap.add_argument("--static_seconds", type=float, default=10.0, help="Hold loop length")
    ap.add_argument("--static_ids", nargs="*", default=[], help="IDs considered static holds")
    ap.add_argument("--subset", nargs="*", default=None, help="Optional subset of scene names to render")
    return ap.parse_args(argv)

def ensure_video_settings(scene):
    scene.render.image_settings.file_format = 'FFMPEG'
    scene.render.ffmpeg.format = 'MPEG4'
    scene.render.ffmpeg.codec = 'H264'
    scene.render.ffmpeg.constant_rate_factor = 'LOW'
    scene.render.ffmpeg.ffmpeg_preset = 'GOOD'
    scene.render.ffmpeg.gopsize = scene.render.fps

def set_resolution(scene, aspect):
    if aspect == "square":
        scene.render.resolution_x = 1080; scene.render.resolution_y = 1080
    elif aspect == "portrait":
        scene.render.resolution_x = 1080; scene.render.resolution_y = 1920
    else:
        scene.render.resolution_x = 1920; scene.render.resolution_y = 1080

def main():
    args = parse_argv()
    os.makedirs(args.out, exist_ok=True)

    scenes = list(bpy.data.scenes)
    if args.subset:
        names = set(args.subset)
        scenes = [s for s in scenes if s.name in names]

    for scene in scenes:
        bpy.context.window.scene = scene
        scene.render.fps = args.fps
        is_static = scene.name in set(args.static_ids)
        seconds = args.static_seconds if is_static else args.seconds
        scene.frame_start = 1
        scene.frame_end = max(2, int(scene.render.fps * seconds))

        ensure_video_settings(scene)
        exercise_id = scene.name
        out_dir = os.path.join(args.out, exercise_id)
        os.makedirs(out_dir, exist_ok=True)

        base = os.path.join(out_dir, f"{exercise_id}_v1_")

        for aspect, wh in (("square","1080x1080"), ("portrait","1080x1920"), ("landscape","1920x1080")):
            set_resolution(scene, aspect)
            scene.render.filepath = base + f"{wh}.mp4"
            bpy.ops.render.render(animation=True)
            print(f"[OK] {exercise_id} {wh}")

    print("All scenes rendered.")

if __name__ == "__main__":
    main()
