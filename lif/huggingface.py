from huggingface_hub import hf_hub_download
import tensorflow as tf

repo_id = "projectlif/lipreading-models"

model_path = hf_hub_download(
    repo_id=repo_id,
    filename="model/model_g.h5"   # must match repo structure
)

model = tf.keras.models.load_model(model_path)
print("Loaded model:", model)


# list all models you want to push
models = [
    "model/model_d.h5",
    "model/model_k.h5",
    "model/model_g.h5"

    # ... add the rest here
]

for model_path in models:
    upload_file(
        path_or_fileobj=model_path,
        path_in_repo=model_path,  
        repo_id=repo_id,
        repo_type="model"
    )
    print(f"✅ Uploaded {model_path}")
