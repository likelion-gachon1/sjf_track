# Clothing segmentation model

- Original PyTorch model: https://huggingface.co/mattmdjaga/segformer_b0_clothes (MIT; fine-tuned on ATR)
- ONNX export: https://huggingface.co/Xenova/segformer_b0_clothes
- Pinned revision: `a2489ea8e7ec1ee912190546bad31a4906ccca76`
- File: `onnx/model.onnx` (FP32)
- SHA256: `02e6f1545475bc549184b6710487555b4b73eb08354cc3a480fb4fab1473a9d3`
- `config.json` and `preprocessor_config.json` are copied from the same revision.

Inference uses ONNX Runtime Web (MIT), in a worker, with local model/WASM assets.
Only Upper-clothes (4), Skirt (5), Pants (6), Dress (7) count toward detection.
Faces, hair, skin, hats, bags, shoes and other accessory labels do not count.
Input: RGB resized to 512x512, scaled by 1/255, ImageNet mean/std, NCHW.
The preview crop is preserved before resizing. Output is evaluated inside the guide.
Predictions remain probabilistic; validate thresholds on the actual booth camera.
