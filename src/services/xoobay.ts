// XOOBAY API Service
// API Documentation: https://www.xoobay.com/api-geo

export interface XoobayProduct {
  id: number;
  name: string;
  money: string;
  shop_id: number;
  img_logo: string;
}

export interface XoobayProductListResponse {
  code: number;
  msg: string;
  data: {
    list: XoobayProduct[];
    pager: {
      page: number;
      count: number;
      pageCount: number;
    };
  };
}

export interface XoobayProductDetail {
  id: string;
  name: string;
  description: string;
  short_description: string;
  category: string;
  sku: string;
  price: string;
  image_url: string;
  gallery_images: string[];
  brand_name: string;
  brand_url: string;
  status: number;
  store_id: number;
  store_name: string;
  store_description: string;
}

export interface XoobayProductDetailResponse {
  code: number;
  msg: string;
  data: XoobayProductDetail;
}

export interface XoobayStore {
  id: number;
  name: string;
  url: string;
  store_url: string;
  remark: string;
}

export interface XoobayStoreResponse {
  code: number;
  msg: string;
  data: XoobayStore;
}

const API_BASE_URL = 'https://www.xoobay.com';
const DEFAULT_API_KEY = 'xoobay_api_ai_geo';

export interface XoobayApiOptions {
  apiKey?: string;
  lang?: 'zh_cn' | 'en' | 'zh_hk' | 'ru';
}

const defaultOptions: XoobayApiOptions = {
  apiKey: DEFAULT_API_KEY,
  lang: 'zh_cn',
};

/**
 * 获取产品列表
 * @param pageNo 页码，默认为1
 * @param name 产品名称搜索（可选）
 * @param shopId 店铺ID搜索（可选）
 * @param options API选项
 */
export async function getProductList(
  pageNo: number = 1,
  name?: string,
  shopId?: string,
  options: XoobayApiOptions = {}
): Promise<XoobayProductListResponse> {
  const opts = { ...defaultOptions, ...options };
  const params = new URLSearchParams({
    pageNo: pageNo.toString(),
    apiKey: opts.apiKey || DEFAULT_API_KEY,
    lang: opts.lang || 'zh_cn',
  });

  if (name) {
    params.append('name', name);
  }
  if (shopId) {
    params.append('shopId', shopId);
  }

  const url = `${API_BASE_URL}/api-geo/product-list?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data: XoobayProductListResponse = await response.json();

    if (data.code !== 200) {
      throw new Error(data.msg || 'Failed to get product list');
    }

    return data;
  } catch (error) {
    console.error('[XOOBAY API] Error fetching product list:', error);
    throw error;
  }
}

/**
 * 获取产品详情
 * @param productId 产品ID
 * @param options API选项
 */
export async function getProductInfo(
  productId: number | string,
  options: XoobayApiOptions = {}
): Promise<XoobayProductDetailResponse> {
  const opts = { ...defaultOptions, ...options };
  const params = new URLSearchParams({
    id: productId.toString(),
    apiKey: opts.apiKey || DEFAULT_API_KEY,
    lang: opts.lang || 'zh_cn',
  });

  const url = `${API_BASE_URL}/api-geo/product-info?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data: XoobayProductDetailResponse = await response.json();

    if (data.code !== 200) {
      throw new Error(data.msg || 'Failed to get product info');
    }

    return data;
  } catch (error) {
    console.error('[XOOBAY API] Error fetching product info:', error);
    throw error;
  }
}

/**
 * 获取店铺详情
 * @param storeId 店铺ID
 * @param options API选项
 */
export async function getStoreInfo(
  storeId: number | string,
  options: XoobayApiOptions = {}
): Promise<XoobayStoreResponse> {
  const opts = { ...defaultOptions, ...options };
  const params = new URLSearchParams({
    id: storeId.toString(),
    apiKey: opts.apiKey || DEFAULT_API_KEY,
    lang: opts.lang || 'zh_cn',
  });

  const url = `${API_BASE_URL}/api-geo/store-info?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data: XoobayStoreResponse = await response.json();

    if (data.code !== 200) {
      throw new Error(data.msg || 'Failed to get store info');
    }

    return data;
  } catch (error) {
    console.error('[XOOBAY API] Error fetching store info:', error);
    throw error;
  }
}

/**
 * 将产品详情转换为页面内容格式（用于AI处理）
 */
export function convertProductToPageContent(
  product: XoobayProductDetail,
  store?: XoobayStore
): {
  title: string;
  text: string;
  images: Array<{ src: string; alt: string; width: number; height: number }>;
} {
  // 构建产品描述文本
  let text = `# ${product.name}\n\n`;
  text += `**Product ID:** ${product.id}\n`;
  text += `**SKU:** ${product.sku}\n`;
  text += `**Category:** ${product.category}\n`;
  text += `**Price:** $${product.price}\n\n`;
  
  if (product.short_description) {
    text += `## Short Description\n${product.short_description}\n\n`;
  }
  
  if (product.description) {
    text += `## Description\n${product.description}\n\n`;
  }
  
  if (store) {
    text += `## Store Information\n`;
    text += `**Store Name:** ${store.name}\n`;
    if (store.remark) {
      text += `**Store Description:** ${store.remark}\n`;
    }
    text += `**Store URL:** ${store.store_url}\n\n`;
  }
  
  if (product.brand_name) {
    text += `## Brand\n**Brand:** ${product.brand_name}\n`;
    if (product.brand_url) {
      text += `**Brand URL:** ${product.brand_url}\n`;
    }
  }

  // 处理图片
  const images: Array<{ src: string; alt: string; width: number; height: number }> = [];
  
  // 主图
  if (product.image_url) {
    images.push({
      src: product.image_url,
      alt: product.name,
      width: 800,
      height: 800,
    });
  }
  
  // 图库图片
  if (product.gallery_images && Array.isArray(product.gallery_images)) {
    product.gallery_images.forEach((imgUrl, index) => {
      if (imgUrl && !images.some(img => img.src === imgUrl)) {
        images.push({
          src: imgUrl,
          alt: `${product.name} - Image ${index + 1}`,
          width: 800,
          height: 800,
        });
      }
    });
  }

  return {
    title: product.name,
    text,
    images,
  };
}
