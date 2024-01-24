# 漫画有声演播

## 前端服务

```bash
pnpm install
pnpm dev

# pnpm build
```

## 后台服务

使用 https://github.com/zyddnys/manga-image-translator

```bash
git clone https://github.com/zyddnys/manga-image-translator.git

# 安装依赖
virtualenv python_embeded
pip install -r requirements.txt
pip install git+https://github.com/kodalli/pydensecrf.git

# 如果报错的话运行
# pip install certifi==2023.07.22
# pip install opencv-python<=4.6.0.66
# pip install protobuf<=3.20.2

# 开启服务
python -m manga_translator -v --mode api --use-gpu

# /colorize_translate, /inpaint_translate, /translate, /get_text.
# 我们调用的/get_text模块，可以添加/translate
```

## 功能介绍

1. 上传图片（可批量）
2. 批量全图 OCR（快捷键 q）
3. 批量语音输出（快捷键 t），单独重新生成语音（r）
4. 支持历史记录（ctrl + z, ctrl + y|ctrl + shift + z）绘制区域 OCR（a），删除生成的识别框（d 画笔绘制需要删除的地方）
5. 文本顺序排序 文本框可拖拽排序 或者 使用画笔根据绘制的区域进行排序，请注意画框变为灰色才为选中状态（快捷键 l）
6. 空格进行播放，如果没有声音重复空格或者先试听一些部分音频
7. 支持自定义格式导出和导入（图片不能过多，推荐最高 30 张，因导出部分包含音频，所以如果文字或图片过大会导致导出失败）
8. 默认没有使用翻译接口，可自行修改 `src/core/ocr.ts` 25 行`isTrans`

## 缺点：

1. 没有后台，所有数据都保存到了前端网页，这导致一旦发生错误将从头再来
2. 数据过大导致导出时间过长
