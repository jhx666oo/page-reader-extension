// Content Script - 注入到网页中读取页面内容

export interface PageContent {
  url: string;
  title: string;
  text: string;
  html: string;
  selectedText: string | null;
  images: ImageInfo[];
  links: LinkInfo[];
  metadata: PageMetadata;
}

export interface ImageInfo {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface LinkInfo {
  href: string;
  text: string;
}

export interface PageMetadata {
  description: string | null;
  keywords: string | null;
  author: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
}

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[Content] Received message:', message.type);
  
  try {
    let response: unknown = null;
    
    switch (message.type) {
      case 'GET_PAGE_CONTENT':
        response = getFullPageContent();
        break;
      case 'GET_SELECTED_TEXT':
        response = { selectedText: getSelectedText() };
        break;
      case 'GET_PAGE_TEXT':
        response = { text: getPageText() };
        break;
      case 'GET_PAGE_HTML':
        response = { html: getPageHTML() };
        break;
      case 'GET_PAGE_IMAGES':
        response = { images: getPageImages() };
        break;
      default:
        console.log('[Content] Unknown message type:', message.type);
        return false;
    }
    
    console.log('[Content] Sending response for:', message.type);
    sendResponse(response);
  } catch (error) {
    console.error('[Content] Error handling message:', error);
    sendResponse({ error: String(error) });
  }
  
  return true; // 保持消息通道打开
});

// 获取完整的页面内容
function getFullPageContent(): PageContent {
  console.log('[Content] Getting full page content');
  return {
    url: window.location.href,
    title: document.title,
    text: getPageText(),
    html: getPageHTML(),
    selectedText: getSelectedText(),
    images: getPageImages(),
    links: getPageLinks(),
    metadata: getPageMetadata(),
  };
}

// 获取页面纯文本内容
function getPageText(): string {
  // 克隆 body 以避免修改原始 DOM
  const clone = document.body.cloneNode(true) as HTMLElement;
  
  // 移除不需要的元素
  const removeSelectors = [
    'script', 'style', 'noscript', 'iframe', 
    'nav', 'footer', 'header', 'aside',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]'
  ];
  
  removeSelectors.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });
  
  // 获取文本并清理空白
  let text = clone.textContent || '';
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
  
  // 限制长度（避免过长）
  return text.slice(0, 50000);
}

// 获取页面 HTML
function getPageHTML(): string {
  // 返回主要内容区域的 HTML
  const main = document.querySelector('main') || 
               document.querySelector('article') || 
               document.querySelector('[role="main"]') ||
               document.body;
  
  // 限制长度
  return main.innerHTML.slice(0, 100000);
}

// 获取选中的文本
function getSelectedText(): string | null {
  const selection = window.getSelection();
  if (selection && selection.toString().trim()) {
    return selection.toString().trim();
  }
  return null;
}

// 获取页面中的所有图片
function getPageImages(): ImageInfo[] {
  const images: ImageInfo[] = [];
  const imgElements = document.querySelectorAll('img');
  
  imgElements.forEach(img => {
    // 只获取有实际 src 的图片
    if (img.src && !img.src.startsWith('data:')) {
      images.push({
        src: img.src,
        alt: img.alt || '',
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
    }
  });
  
  // 限制数量
  return images.slice(0, 50);
}

// 获取页面中的所有链接
function getPageLinks(): LinkInfo[] {
  const links: LinkInfo[] = [];
  const linkElements = document.querySelectorAll('a[href]');
  
  linkElements.forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      links.push({
        href: new URL(href, window.location.href).href,
        text: link.textContent?.trim() || '',
      });
    }
  });
  
  // 去重并限制数量
  const uniqueLinks = links.filter((link, index, self) => 
    index === self.findIndex(l => l.href === link.href)
  );
  
  return uniqueLinks.slice(0, 100);
}

// 获取页面元数据
function getPageMetadata(): PageMetadata {
  const getMeta = (name: string): string | null => {
    const meta = document.querySelector(`meta[name="${name}"]`) ||
                 document.querySelector(`meta[property="${name}"]`);
    return meta?.getAttribute('content') || null;
  };
  
  return {
    description: getMeta('description'),
    keywords: getMeta('keywords'),
    author: getMeta('author'),
    ogTitle: getMeta('og:title'),
    ogDescription: getMeta('og:description'),
    ogImage: getMeta('og:image'),
  };
}

console.log('[Content] AI Chat content script loaded on:', window.location.href);
