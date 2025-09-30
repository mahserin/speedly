import axios from "axios";
import translationModel from "./../model/translation"

import getConfig from "./getConfig";
const configs : {one_api_token ?: string} = {...getConfig('translate')}
async function firstSuccessful(promises : Promise<any>[]) {
  return new Promise((resolve, reject) => {
    let rejections = 0;
    const total = promises.length;

    promises.forEach((p) => {
      Promise.resolve(p)
        .then(resolve)
        .catch(() => {
          rejections++;
          if (rejections === total) {
            reject(new Error("همه ترجمه‌ها شکست خوردند"));
          }
        });
    });
  });
}

export default async (text : string = "unspecified text", lang = "fa") => {
  const formattedText = text
    .replaceAll(/[\-\_]/g, " ")
    .replaceAll(/[A-Z]/g, " $&");
const translationDoc = await translationModel.findOne({ text: formattedText, lang });
if(translationDoc) return translationDoc.translatedText
  const translationPromises = []
  translationPromises.push((async () => {
    const res = await axios.get(
      `https://655.mtis.workers.dev/translate?text=${encodeURIComponent(formattedText)}&source_lang=en&target_lang=${lang}`,{timeout :2000}
    );
    if (!res.data?.response?.translated_text)
      throw new Error("Translation failed");
    return res.data.response.translated_text;
  })())

  if(configs.one_api_token)translationPromises.push((async () => {
    const res = await axios.post(
      "https://api.one-api.ir/translate/v1/microsoft",
      {
        text: formattedText,
        target: lang,
      },
      {
        timeout:2000,
        headers: {
          "one-api-token": configs.one_api_token
        },
      }
    );
    if (res.data.status === 200) {
      return res.data.result;
    } else {
      throw new Error(res.data.message);
    }
  })())


  try {
    const result = await firstSuccessful(translationPromises);
    await translationModel.create({ text: formattedText, lang, translatedText: result });
    return result;
  } catch (err) {
    console.error("translator error:", err);
    return formattedText; 
  }
};
