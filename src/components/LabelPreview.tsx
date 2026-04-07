import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export type LabelData = {
  activeTab: string;
  daniel: { item: string; caixa: string; pedido: string; pd: string; peca: string };
  dupla: { 
     nomeEsq: string; caixaEsq: string; barcodeEsq: string;
     nomeDir: string; caixaDir: string; barcodeDir: string;
  };
  completa: { produto: string; caixa: string; fornecedor: string; barcode: string };
};

export default function LabelPreview({ data, width, height, dpi }: { data: LabelData, width: number, height: number, dpi: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw border
    ctx.strokeStyle = "#C0C0C0";
    ctx.lineWidth = (0.5 * dpi) / 25.4;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    const px = (mm: number) => (mm * dpi) / 25.4;

    if (data.activeTab === "daniel") {
      const d = data.daniel;
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      
      const titleFS = d.item.length > 12 ? px(6) : px(8);
      ctx.font = `bold ${titleFS}px Inter, sans-serif`;
      ctx.fillText(d.item, canvas.width / 2, px(12));

      ctx.strokeStyle = "#BBBBBB";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px(5), px(14));
      ctx.lineTo(canvas.width - px(5), px(14));
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.font = `${px(4)}px Inter, sans-serif`;
      ctx.fillText(`Nº Caixa: ${d.caixa}`, px(10), px(20));
      ctx.fillText(`Nº Pedido: ${d.pedido}`, px(10), px(26));
      
      ctx.textAlign = "center";
      ctx.font = `bold ${px(4.5)}px Inter, sans-serif`;
      ctx.fillText(`PD: ${d.pd}   PC: ${d.peca}`, canvas.width / 2, px(34));
    } else if (data.activeTab === "dupla") {
      const d = data.dupla;
      const mid = canvas.width / 2;
      
      ctx.beginPath();
      ctx.moveTo(mid, px(5));
      ctx.lineTo(mid, canvas.height - px(5));
      ctx.stroke();

      const drawSide = (xOff: number, sideData: { nome: string; caixa: string; bc: string }) => {
        ctx.fillStyle = "black";
        ctx.textAlign = "center";
        const fsz = sideData.nome.length > 12 ? px(3.5) : px(4.5);
        ctx.font = `bold ${fsz}px Inter, sans-serif`;
        ctx.fillText(sideData.nome, xOff + mid / 2, px(8));
        
        ctx.font = `${px(3)}px Inter, sans-serif`;
        ctx.fillText(`C: ${sideData.caixa}`, xOff + mid / 2, px(12));

        if (sideData.bc) {
           const tempCanvas = document.createElement("canvas");
           try {
              JsBarcode(tempCanvas, sideData.bc, {
                format: "CODE128",
                width: 1.2,
                height: 30,
                displayValue: true,
                fontSize: 10,
              });
              ctx.drawImage(tempCanvas, xOff + (mid - px(30))/2, px(18), px(30), px(10));
           } catch(e) {}
        }
      };

      drawSide(0, { nome: d.nomeEsq, caixa: d.caixaEsq, bc: d.barcodeEsq });
      drawSide(mid, { nome: d.nomeDir, caixa: d.caixaDir, bc: d.barcodeDir });
    } else if (data.activeTab === "fragil") {
       ctx.fillStyle = "black";
       ctx.textAlign = "center";
       ctx.font = `bold ${px(10)}px Inter, sans-serif`;
       ctx.fillText("CUIDADO", canvas.width / 2 + px(10), px(25));
       ctx.font = `bold ${px(5)}px Inter, sans-serif`;
       ctx.fillText("PRODUTO FRÁGIL", canvas.width / 2 + px(10), px(35));
       
       // Simple icon
       ctx.lineWidth = px(1);
       ctx.beginPath();
       ctx.moveTo(px(20), px(15));
       ctx.lineTo(px(20), px(40));
       ctx.lineTo(px(40), px(40));
       ctx.stroke();
    } else if (data.activeTab === "completa") {
       const d = data.completa;
       ctx.fillStyle = "black";
       ctx.textAlign = "center";
       ctx.font = `bold ${px(4)}px Inter, sans-serif`;
       ctx.fillText(d.produto, canvas.width /2, px(10), canvas.width - px(10));
       
       ctx.textAlign = "left";
       ctx.font = `${px(3.5)}px Inter, sans-serif`;
       ctx.fillText(`Caixa: ${d.caixa}`, px(10), px(20));
       ctx.fillText(`Fornec: ${d.fornecedor}`, px(10), px(26));
       
       if (d.barcode) {
          const tempCanvas = document.createElement("canvas");
          try {
             JsBarcode(tempCanvas, d.barcode, {
               format: "EAN13",
               width: 1.5,
               height: 40,
               displayValue: true,
             });
             ctx.drawImage(tempCanvas, (canvas.width - px(50))/2, px(32), px(50), px(14));
          } catch(e) {}
       }
    }

  }, [data, width, height, dpi]);

  return (
    <canvas 
      ref={canvasRef} 
      width={(width * dpi) / 25.4} 
      height={(height * dpi) / 25.4} 
      className="max-w-full h-auto rounded border border-slate-200 shadow-md"
    />
  );
}
