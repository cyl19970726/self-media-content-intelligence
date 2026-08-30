const articleHeadingCopy: Record<string, string> = {
  "完整机器逐字稿与证据映射": "逐句字幕与画面依据",
  "逐字字幕与证据映射": "逐句字幕与画面依据",
  "完整机器逐字稿": "自动识别的完整文字稿",
  "机器逐字稿与烧录字幕冲突": "自动字幕与画面字幕的差异"
};

export function friendlyArticleHeading(value: string) {
  return articleHeadingCopy[value] ?? value;
}

export function withoutEmbeddedTranscript(markdown: string) {
  return markdown.replace(
    /\n#{1,4}\s+(?:完整机器逐字稿与证据映射|逐字字幕与证据映射|逐句字幕与画面依据|完整机器逐字稿)\s*\n[\s\S]*$/,
    ""
  ).trim();
}
