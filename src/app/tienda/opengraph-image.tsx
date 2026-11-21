import { ImageResponse } from "next/og";
export const alt = "Elegí tus favoritos y pedí por WhatsApp";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function StorePreview() {
  return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",padding:80,background:"#f5f4ec",color:"#31563d"}}><div style={{display:"flex",fontSize:24,letterSpacing:5,marginBottom:36}}>Aurix Retail · TIENDA</div><div style={{display:"flex",fontSize:78,fontWeight:700,lineHeight:1.1}}>Encontrá tus favoritos</div><div style={{display:"flex",fontSize:32,marginTop:32}}>Elegí, armá tu carrito y pedí por WhatsApp.</div></div>, size);
}
