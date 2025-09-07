from huggingface_hub import login

login("HF_TOKEN")



from huggingface_hub import HfApi, HfFolder, Repository
from huggingface_hub import upload_file

repo_id = "projectlif/lipreading-models"

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
