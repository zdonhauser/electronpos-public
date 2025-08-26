const { contextBridge, ipcRenderer } = require('electron');

import * as Types from "./types/POSTypes";



contextBridge.exposeInMainWorld('electronAPI', {
    getClockinOnlyMode: async () => ipcRenderer.invoke("get-clockin-only-mode"),
    selectDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    readDirectory: (directoryPath: any) => ipcRenderer.invoke('read-directory', directoryPath),
    readFileAsDataURL: (filePath: any) => ipcRenderer.invoke('read-file-as-data-url', filePath),
    writeFile: (fileName: string, data: Buffer | string) => ipcRenderer.invoke('write-file', fileName, data),
    getStoredDirectoryPath: () => ipcRenderer.invoke('get-stored-directory-path'),
    findPrinters:()=>ipcRenderer.invoke('find-printers'),
    printReceipt:(data: any)=>ipcRenderer.invoke('print-receipt',data),
    printTestPage: (printerName: any) => ipcRenderer.invoke('print-test-page',printerName),
    printTimeclockReceipt: (name: string, clockEntries: any[]) => ipcRenderer.invoke('print-timeclock-receipt', name,clockEntries),
    printOrder: (
        e: any,
        order: Types.ExtendedLineItem[],
        transactions: Types.Transaction[],
        orderNumber: number,
        totalTax: number,
        discountCodes: Types.DiscountCode[],
        subtotalPrice: number,
        totalPrice: number,
        customer: any
    ) => ipcRenderer.invoke(
        'print-order',
        e,
        order,
        transactions,
        orderNumber,
        totalTax,
        discountCodes,
        subtotalPrice,
        totalPrice,
        customer
    ),
    printTicket: (kdsOrder: Types.KDSOrder) => ipcRenderer.invoke('print-kds-ticket', kdsOrder),
    reprintLastOrder: () => ipcRenderer.invoke('reprint-last-order'),
    openDrawer: () => ipcRenderer.invoke('open-drawer'),
});



window.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = `body::-webkit-scrollbar { display: none !important; }`;
  document.head.appendChild(style);
});
