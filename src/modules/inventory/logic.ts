export function canAddProduct(product: { current_stock: number }) {
    return product.current_stock > 0;
}

export function isWebP(mimeType: string) {
    return mimeType === 'image/webp';
}
