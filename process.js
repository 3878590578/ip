const fs = require('fs');
const puppeteer = require('puppeteer');

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

// 使用无头 Chrome 抓取并解析 JSON
async function fetchWithPuppeteer() {
  console.log("启动无头 Chrome 浏览器拉取数据...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  
  try {
    await page.goto("https://zip.cm.edu.kg/all.json", {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // 从页面节点中提取纯文本 JSON
    const jsonText = await page.evaluate(() => {
      return document.querySelector('pre') ? document.querySelector('pre').innerText : document.body.innerText;
    });

    await browser.close();

    // 解析 JSON
    const parsedData = JSON.parse(jsonText.trim());
    return Array.isArray(parsedData) ? parsedData : (parsedData.data || []);
  } catch (err) {
    await browser.close();
    throw new Error(`Puppeteer 抓取或解析失败: ${err.message}`);
  }
}

async function main() {
  try {
    const data = await fetchWithPuppeteer();
    console.log(`成功获取数据，节点总数: ${data.length}`);
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

    console.log("处理完毕：quanbu.txt 及各个国家 txt 文件已成功生成！");

  } catch (err) {
    console.error("执行脚本发生错误:", err);
    process.exit(1);
  }
}

main();
