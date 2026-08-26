const fs = require('fs');

const keywordMap = {
  "AS906": "DMIT.txt",
  "AS16509": "Amazon.txt",
  "AS45102": "Alibaba.txt",
  "AS8075": "Microsoft.txt",
  "AS61112": "AKILE.txt",
  "AS25820": "Networks.txt",
  "AS967": "VMISS.txt"
};

try {
  if (!fs.existsSync('quanbu.txt')) {
    console.log("quanbu.txt 不存在，跳过处理");
    process.exit(0);
  }

  const lines = fs.readFileSync('quanbu.txt', 'utf-8').split('\n');

  for (const [keyword, fileName] of Object.entries(keywordMap)) {
    const matchedLines = lines.filter(line => line.includes(keyword));
    fs.writeFileSync(fileName, matchedLines.join('\n'));
    console.log(`已提取 ${keyword} -> ${fileName} (共 ${matchedLines.length} 条)`);
  }
} catch (err) {
  console.error("提取关键词失败:", err);
  process.exit(1);
}
