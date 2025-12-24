import { useState, useCallback } from 'react';
import {
  getProductList,
  getProductInfo,
  getStoreInfo,
  convertProductToPageContent,
  XoobayProduct,
  XoobayProductDetail,
  XoobayStore,
  XoobayApiOptions,
} from '@/services/xoobay';
import { PageContent, ImageInfo } from '@/types';

export interface XoobaySearchParams {
  pageNo?: number;
  name?: string;
  shopId?: string;
}

export function useXoobay() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<XoobayProduct[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  /**
   * 搜索产品列表
   */
  const searchProducts = useCallback(async (
    params: XoobaySearchParams = {},
    options: XoobayApiOptions = {}
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getProductList(
        params.pageNo || 1,
        params.name,
        params.shopId,
        options
      );

      setProducts(result.data.list);
      setCurrentPage(result.data.pager.page);
      setTotalPages(result.data.pager.pageCount);
      setTotalCount(result.data.pager.count);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取产品详情并转换为页面内容格式
   */
  const loadProductAsPageContent = useCallback(async (
    productId: number | string,
    options: XoobayApiOptions = {}
  ): Promise<PageContent | null> => {
    setLoading(true);
    setError(null);

    try {
      // 获取产品详情
      const productResult = await getProductInfo(productId, options);
      const product = productResult.data;

      // 尝试获取店铺信息
      let store: XoobayStore | undefined;
      try {
        if (product.store_id) {
          const storeResult = await getStoreInfo(product.store_id, options);
          store = storeResult.data;
        }
      } catch (err) {
        console.warn('[XOOBAY] Failed to load store info:', err);
        // 店铺信息获取失败不影响产品加载
      }

      // 转换为页面内容格式
      const converted = convertProductToPageContent(product, store);

      // 转换为 PageContent 格式
      const pageContent: PageContent = {
        url: `${options.lang === 'en' ? 'https://www.xoobay.com' : 'https://www.xoobay.com'}/product/${product.id}`,
        title: converted.title,
        text: converted.text,
        html: `<h1>${product.name}</h1><p>${product.description}</p>`,
        selectedText: null,
        images: converted.images as ImageInfo[],
        links: [],
        metadata: {
          description: product.short_description || product.description,
          keywords: product.category,
          author: product.brand_name || 'XOOBAY',
          ogTitle: product.name,
          ogDescription: product.short_description || product.description,
          ogImage: product.image_url,
        },
      };

      return pageContent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取产品详情（原始数据）
   */
  const getProductDetail = useCallback(async (
    productId: number | string,
    options: XoobayApiOptions = {}
  ): Promise<XoobayProductDetail | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await getProductInfo(productId, options);
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取店铺信息
   */
  const getStoreDetail = useCallback(async (
    storeId: number | string,
    options: XoobayApiOptions = {}
  ): Promise<XoobayStore | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await getStoreInfo(storeId, options);
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    products,
    currentPage,
    totalPages,
    totalCount,
    searchProducts,
    loadProductAsPageContent,
    getProductDetail,
    getStoreDetail,
  };
}
