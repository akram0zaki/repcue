
# build_catalog_blend.py
import bpy, sys, os, argparse

def parse_argv():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--")+1:]
    else:
        argv = []
    ap = argparse.ArgumentParser()
    ap.add_argument("--template", required=True, help="Path to repcue_template.blend")
    ap.add_argument("--src", required=True, help="Folder with <exercise_id>.fbx|glb")
    ap.add_argument("--out_blend", required=True, help="Output .blend path to save catalog")
    ap.add_argument("--ids", nargs="+", required=True, help="Exercise IDs to import")
    ap.add_argument("--static_ids", nargs="*", default=[], help="IDs considered time-hold/static")
    ap.add_argument("--seconds", type=float, default=2.2, help="Default seconds per rep")
    ap.add_argument("--static_seconds", type=float, default=10.0, help="Seconds per static hold loop")
    ap.add_argument("--fps", type=int, default=30, help="Frames per second")
    return ap.parse_args(argv)

def append_template_scene(template_path):
    # Append the first scene from template (assume it's the main scene)
    with bpy.data.libraries.load(template_path, link=False) as (data_from, data_to):
        # Prefer a scene named "Scene" or the first available
        preferred = "Scene" if "Scene" in data_from.scenes else (data_from.scenes[0] if data_from.scenes else None)
        data_to.scenes = [preferred] if preferred else []
    if not data_to.scenes:
        raise RuntimeError("No scene found in template .blend")
    return data_to.scenes[0]

def import_asset_into_scene(scene, asset_path):
    # Switch context to scene
    bpy.context.window.scene = scene
    ext = os.path.splitext(asset_path)[1].lower()
    if ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=asset_path, automatic_bone_orientation=True)
    elif ext in (".glb",".gltf"):
        bpy.ops.import_scene.gltf(filepath=asset_path)
    else:
        raise RuntimeError(f"Unsupported asset format: {ext}")
    # Center on origin
    for obj in scene.objects:
        if obj.type in {"ARMATURE","MESH"} and abs(obj.location.x) > 100:
            obj.location = (0,0,obj.location.z)

def set_timeline(scene, fps, seconds):
    scene.frame_start = 1
    scene.frame_end = max(2, int(fps * seconds))
    scene.render.fps = fps

def find_asset(src_dir, ex_id):
    for ext in (".fbx",".glb",".gltf"):
        cand = os.path.join(src_dir, ex_id + ext)
        if os.path.exists(cand):
            return cand
    return None

def main():
    args = parse_argv()
    # Start from a clean file
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # For each exercise, append template scene and import the corresponding asset
    created_scenes = []
    for ex_id in args.ids:
        tmpl_scene = append_template_scene(args.template)
        # Rename cloned scene uniquely
        scene = tmpl_scene
        scene.name = f"{ex_id}"
        # Load asset
        asset = find_asset(args.src, ex_id)
        if not asset:
            print(f"[WARN] Missing asset for {ex_id}: expected {ex_id}.fbx|.glb in {args.src}")
        else:
            import_asset_into_scene(scene, asset)
        # Timeline
        seconds = args.static_seconds if ex_id in args.static_ids else args.seconds
        set_timeline(scene, args.fps, seconds)
        created_scenes.append(scene.name)
    # Remove any leftover default scenes not in our list
    for sc in list(bpy.data.scenes):
        if sc.name not in created_scenes:
            try:
                bpy.data.scenes.remove(sc)
            except RuntimeError:
                pass
    # Save the catalog .blend
    os.makedirs(os.path.dirname(args.out_blend), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=args.out_blend, compress=True, copy=False)
    print(f"Saved catalog: {args.out_blend} with scenes: {created_scenes}")

if __name__ == "__main__":
    main()
