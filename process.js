const fs = require('fs');

// 1. 国家/地区映射表
const countryMap = {
  "HK": "🇭🇰香港",
  "TW": "🇨🇳台湾",
  "SG": "🇸🇬新加坡",
  "JP": "🇯🇵日本",
  "KR": "🇰🇷韩国",
  "US": "🇺🇸美国",
  "IN": "🇮🇳印度"
};

// 2. 排序权重
const sortOrder = ["HK", "TW", "SG", "JP", "KR", "US", "IN"];

async function fetchData(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache'
  };

  let response = await fetch(url, { headers });
  
  // 如果还是被拦截，尝试备用 User-Agent
  if (response.status === 403) {
    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    response = await fetch(url, { headers });
  }

  if (!response.ok) {
    throw new Error(`HTTP 请求失败: ${response.status}`);
  }
  return await response.json();
}

async function main() {
  try {
    const data = await fetchData("https://zip.cm.edu.kg/all.json");
    let rawLines = [];

    // 解析格式：IP:Port#US-AS31898-Oracle Corporation
    for (const item of data) {
      if (!item.ip || !item.port || !item.port.length || !item.meta) continue;
      const ip = item.ip;
      const port = item.port[0];
      const country = item.meta.country || "UNKNOWN";
      const asn = item.meta.asn ? `AS${item.meta.asn}` : "";
      const org = item.meta.asOrganization || "";
      
      const metaStr = [country, asn, org].filter(Boolean).join("-");
      rawLines.push(`${ip}:${port}#${metaStr}`);
    }

    // 解析结构
    let parsedLines = rawLines.map(line => {
      let sharpIndex = line.indexOf("#");
      if (sharpIndex === -1) {
        return { line, countryCode: "UNKNOWN", rest: "", hasSharp: false };
      }
      let afterSharp = line.substring(sharpIndex + 1);
      let countryCode = afterSharp.substring(0, 2).toUpperCase();
      
      return {
        original: line,
        beforeSharp: line.substring(0, sharpIndex),
        countryCode: countryCode,
        afterSharp: afterSharp,
        hasSharp: true
      };
    });

    // 排序
    parsedLines.sort((a, b) => {
      let indexA = sortOrder.indexOf(a.countryCode);
      let indexB = sortOrder.indexOf(b.countryCode);
      if (indexA === -1) indexA = 999;
      if (indexB === -1) indexB = 999;
      return indexA - indexB;
    });

    // 重命名逻辑与按国家分类集合
    let nameCounter = {};
    let allResultLines = [];
    let countryGroup = { "HK": [], "TW": [], "SG": [], "JP": [], "KR": [], "US": [], "IN": [] };

    for (let item of parsedLines) {
      if (!item.hasSharp) {
        allResultLines.push(item.original);
        continue;
      }
      
      let prefix = countryMap[item.countryCode] || "";
      let newAfterSharp = prefix + item.afterSharp;
      
      if (!nameCounter[newAfterSharp]) {
        nameCounter[newAfterSharp] = 1;
      } else {
        nameCounter[newAfterSharp]++;
      }
      
      let finalLine = `${item.beforeSharp}#${newAfterSharp}-${nameCounter[newAfterSharp]}`;
      allResultLines.push(finalLine);

      if (countryGroup[item.countryCode]) {
        countryGroup[item.countryCode].push(finalLine);
      }
    }

    // 写入 quanbu.txt
    fs.writeFileSync('quanbu.txt', allResultLines.join('\n'));

    // 写入各个国家的 txt 文件
    for (const code of sortOrder) {
      fs.writeFileSync(`${code}.txt`, countryGroup[code].join('\n'));
    }

    console.log("处理完毕：所有 txt 文件已成功生成！");

  } catch (err) {
    console.error("执行脚本发生错误:", err);
    process.exit(1);
  }
}

main();
