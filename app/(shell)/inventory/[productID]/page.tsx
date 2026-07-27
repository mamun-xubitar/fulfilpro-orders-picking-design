import ProductDetailPage from './modules';

export default async function Page({ params }: { params: Promise<{ productID: string }> }) {
  const { productID } = await params;
  return <ProductDetailPage productId={productID} />;
}
