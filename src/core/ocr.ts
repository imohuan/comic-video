import { isString } from "lodash-es";

import { OcrTextDetail, OcrTextResult } from "../interface";
import { base64ToFile, converterText, uuidv4 } from "./utils";

/**
 * 获取图片OCR信息
 * @param file 图片File，或者图片Base64编码
 * @param rect 原始图片的长宽，和画布偏移的x，y
 * @returns
 */
export async function getText(file: File | string, isTrans = false, langText: string = "CHS"): Promise<OcrTextResult> {
  const formData = new FormData();
  formData.append(
    "image",
    isString(file)
      ? base64ToFile({
          filename: uuidv4() + ".jpg",
          type: "jpg/jpeg",
          image: file,
        })
      : file
  );

  const url = `${import.meta.env.DEV ? "/api" : ""}/${isTrans ? "translate" : "get_text"}`;

  console.log(isTrans, langText);
  if (isTrans) {
    formData.append("target_language", langText);
  }

  return fetch(url, { method: "POST", body: formData })
    .then((res) => res.json())
    .then((res: any) => {
      if (res.status === 500) throw new Error("报错");
      return res;
    })
    .then((result: OcrTextResult) => {
      result.details.forEach((detail) => {
        // 修复文本
        detail.text = converterText((detail as any).text.originalText);
      });
      // 过滤掉英文内容
      result.details = result.details.filter((m: OcrTextDetail) => !/^[a-z0-9A-Z]+$/.test(m.text));
      return result;
    });
}
