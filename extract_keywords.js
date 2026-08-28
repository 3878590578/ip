const fs = require('fs');

// 1. 需要包含的 7 个国家/地区标识（同时支持 Emoji 前缀和国家代码）
const allowedCountries = ["🇭🇰", "🇨🇳", "🇸🇬", "🇯🇵", "🇰🇷", "🇺🇸", "🇮🇳", "HK-", "TW-", "SG-", "JP-", "KR-", "US-", "IN-"];

// 2. 关键词与对应的文件名映射
const keywordMap = {
  "AS906": "DMIT.txt",
  "AS16509": "Amazon.txt",
  "AS45102": "Alibaba.txt",
  "AS8075": "Microsoft.txt",
  "AS61112": "AKILE.txt",
  "AS25820": "Networks.txt",
  "AS174": "Cogent.txt",
  "AS967": "VMISS.txt"
};

try {
  if (!fs.existsSync('quanbu.txt')) {
    console.log("quanbu.txt 不存在，跳过处理");
    process.exit(0);
  }

  // 读取 quanbu.txt 并按行分割，过滤掉空行
  const lines = fs.readFileSync('quanbu.txt', 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  for (const [keyword, fileName] of Object.entries(keywordMap)) {
    // 过滤逻辑：同时满足属于 7 个国家之一 AND 包含关键词
    const matchedLines = lines.filter(line => {
      const isAllowedCountry = allowedCountries.some(country => line.includes(country));
      const hasKeyword = line.includes(keyword);
      return isAllowedCountry && hasKeyword;
    });

    // 写入文件（覆盖模式）
    fs.writeFileSync(fileName, matchedLines.join('\n'));
    console.log(`已提取 [7国限定] ${keyword} -> ${fileName} (共 ${matchedLines.length} 条)`);
  }
} catch (err) {
  console.error("提取关键词失败:", err);
  process.exit(1);
}
