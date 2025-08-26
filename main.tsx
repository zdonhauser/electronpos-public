const { app, BrowserWindow, ipcMain, dialog, session, Menu, MenuItem, MenuItemConstructorOptions } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const url = require("url");
const https = require("https");
const appLogPath = "./app.log";
const axios = require("axios"); // Axios is used for HTTP requests
const fs = require("fs");
const ElectronStore = require("electron-store");
const electronStore = new ElectronStore();

import {
  PosPrinter,
  PosPrintData,
  PosPrintOptions,
} from "electron-pos-printer";

import * as Types from "./types/POSTypes";
const isDev = require("electron-is-dev");
const net = require("net");
// Replace with your printer's IP address and port
let printerIp = "";
const port = 9100;
const dotenv = require("dotenv");
const { Client } = require("pg");

// Load environment variables from .env file
const envPath = isDev
  ? path.join(__dirname, "../", ".env")
  : path.join(process.resourcesPath, ".env");
dotenv.config({ path: envPath });

// PostgreSQL Database Configuration
const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

const dbClient = new Client(dbConfig);

// Connect to the PostgreSQL database
dbClient
  .connect()
  .then(() => console.log("Connected to PostgreSQL database"))
  .catch((err: any) =>
    console.error("Failed to connect to PostgreSQL database:", err)
  );

// Listen to the timeclock_channel
dbClient.query("LISTEN timeclock_channel");

dbClient.on("notification", async (msg: { payload: string }) => {
  try {
    const data = JSON.parse(msg.payload);
    console.log("Received timeclock update:", data);

    // Extract data for printing
    const { employee_name, clock_in, clock_out } = data;

    const clockEntries = [
      {
        id: data.id,
        clock_in,
        clock_out,
      },
    ];

    // Trigger receipt printing
    await printTimeclockReceipt(employee_name, clockEntries);
  } catch (error) {
    console.error("Error processing timeclock notification:", error);
  }
});

dbClient.on("error", (err: any) => {
  console.error("PostgreSQL listener error:", err);
});

// ESC/POS command to open cash drawer
const openDrawerCommand = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);

const client = new net.Socket();

// Function to append logs to the file
function logToFile(message: string) {
  fs.appendFile(appLogPath, message + "\n", (err: any) => {
    if (err) {
      // If an error occurs during logging, print it to the console
      console.error("Failed to write to log file:", err);
    }
  });
}

// Enhance console functions to log to file as well as standard output
function enhanceLogging() {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;

  console.log = (...args) => {
    originalConsoleLog(...args);
    logToFile(
      `[LOG] ${new Date().toISOString()} - ${args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
        .join(" ")}`
    );
  };

  console.error = (...args) => {
    originalConsoleError(...args);
    logToFile(
      `[ERROR] ${new Date().toISOString()} - ${args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
        .join(" ")}`
    );
  };

  console.warn = (...args) => {
    originalConsoleWarn(...args);
    logToFile(
      `[WARN] ${new Date().toISOString()} - ${args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
        .join(" ")}`
    );
  };

  console.info = (...args) => {
    originalConsoleInfo(...args);
    logToFile(
      `[INFO] ${new Date().toISOString()} - ${args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
        .join(" ")}`
    );
  };
}




// -----------------------------------------------------------------------------
// 3. IPC handler so the renderer can save the new startup path.
// -----------------------------------------------------------------------------
ipcMain.handle(
  'set-startup-path',
  async (_event: typeof ipcMain, newPath: string): Promise<boolean> => {
    // Persist the new suffix, defaulting back to "/"
    electronStore.set('startupPath', newPath || '/');
    return true;
  }
);

const { fork } = require("child_process");
let serverProcess: {
  stdout: { on: (arg0: string, arg1: (data: any) => void) => void };
  stderr: { on: (arg0: string, arg1: (data: any) => void) => void };
  on: (arg0: string, arg1: (code: any) => void) => void;
  kill: () => void;
};

function startServer() {
  const serverPath = isDev
    ? path.join(__dirname, "..", "posdashboard", "dist", "index.js") // Dev path
    : path.join(
        process.resourcesPath,
        "app.asar.unpacked",
        "posdashboard",
        "dist",
        "index.js"
      ); // Production path

  console.log("Starting server from path:", serverPath);
  console.log("electron port in main: ", process.env.ELECTRON_PORT);
  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      NODE_ENV: "electron",
      ELECTRON_PORT: process.env.ELECTRON_PORT,
    }, // Set NODE_ENV to 'production'
    cwd: path.dirname(serverPath), // Set working directory to the server path
    silent: true, // Capture stdout and stderr
  });

  serverProcess.stdout.on("data", (data: any) => {
    console.log(`Server: ${data}`);
  });

  serverProcess.stderr.on("data", (data: any) => {
    console.error(`Server Error: ${data}`);
  });

  serverProcess.on("close", (code: any) => {
    console.log(`Server process exited with code ${code}`);
  });
}

// Kill the server process when the app quits
app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    console.log("Server process terminated");
  }
});

// Function to check if the server is ready, now returns a boolean

async function checkServerReady(retryInterval = 2000, maxRetries = 30) {
  console.log("Checking server readiness...");
  let attempts = 0;

  return new Promise((resolve) => {
    const attemptConnection = () => {
      attempts++;
      https
        .get(
          {
            hostname: "localhost",
            port: process.env.ELECTRON_PORT || 8901,
            path: "/",
            rejectUnauthorized: false, // Ignore self-signed certificate issues for localhost
          },
          (res: { statusCode: number }) => {
            if (res.statusCode === 200) {
              console.log("Server is ready");
              resolve(true);
            } else {
              if (attempts < maxRetries) {
                console.log(
                  `Attempt ${attempts} failed, retrying in ${retryInterval}ms...`
                );
                setTimeout(attemptConnection, retryInterval);
              } else {
                console.log("Server is not ready after maximum retries");
                resolve(false);
              }
            }
          }
        )
        .on("error", (err: { message: any }) => {
          console.log(`Attempt ${attempts} failed with error: ${err.message}`);
          if (attempts < maxRetries) {
            setTimeout(attemptConnection, retryInterval);
          } else {
            console.log("Server is not ready after maximum retries");
            resolve(false);
          }
        });
    };

    attemptConnection();
  });
}

// Define NSApplicationDelegate implementation to support secure restorable state
app.whenReady().then(async () => {
  app.on("will-finish-launching", () => {
    app.setNSApplicationDelegate({
      applicationSupportsSecureRestorableState: () => true, // Opt-in to secure restorable state
    });
  });

  //startServer(); // Start the server
  //const serverReady = await checkServerReady();

  session.defaultSession.setCertificateVerifyProc(
    (request: { hostname: string }, callback: (arg0: number) => void) => {
      if (request.hostname === "localhost") {
        callback(0); // 0 means trust the certificate
      } else {
        callback(-3); // Use default certificate verification
      }
    }
  );

  app.on(
    "certificate-error",
    (
      event: { preventDefault: () => void },
      webContents: any,
      url: string,
      error: any,
      certificate: any,
      callback: (arg0: boolean) => void
    ) => {
      if (url.startsWith("https://localhost")) {
        event.preventDefault();
        callback(true); // Trust self-signed certificates for localhost
      } else {
        callback(false);
      }
    }
  );

  // Create your BrowserWindow and load your web application
  let mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: "ZDT's Point of Sale", // Set the window title here
    icon: path.join(__dirname, "../assets/icon.ico"),
    webPreferences: {
      nodeIntegration: false, // Ensure nodeIntegration is disabled for security
      contextIsolation: true, // Enable context isolation for additional security
      preload: path.join(__dirname, "preload.js"), // Absolute path to preload script
    },
  });

  mainWindow.maximize();

  const startupPath = electronStore.get('startupPath',"");

  const localURL = `https://localhost:${process.env.ELECTRON_PORT ?? 8901}`;
const hostedURL = `https://posdashboard.zdtamusement.com`;

  const localURLwithStartupPath = localURL + `/${startupPath}`;
  const hostedURLwithStartupPath = hostedURL + `/${startupPath}`;



  startServer();
  const serverReady = await checkServerReady();

  if (serverReady) {
    mainWindow.loadURL(localURLwithStartupPath);
  } else {
    console.log('Local server not ready; loading hosted URL.');
    mainWindow.loadURL(hostedURLwithStartupPath);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  const createSettingsMenu = async (mainWindow: {
    setFullScreen(arg0: boolean): unknown;
    isFullScreen(): unknown;
    webContents: { getPrintersAsync: () => any; toggleDevTools: () => any };
    loadURL: (arg0: string) => any;
  }) => {
    if (!mainWindow) return;

    const clockinOnlyMode = electronStore.get("clockinOnlyMode", false); // Default to false

    let printers = await mainWindow.webContents.getPrintersAsync();
    const selectedPrinter = electronStore.get("selectedPrinter");
    const selectedTimeclockPrinter = electronStore.get(
      "selectedTimeclockPrinter"
    );
    printerIp = electronStore.get("printerIP");

    // Add None and Preview Mode to the printers array
    const allPrinterOptions = [
      ...printers,
      { name: "None", isVirtual: true },
      { name: "Preview Mode", isVirtual: true },
    ];

    const printerSubmenuItems = allPrinterOptions.map(
      (printer: { ipAddress?: any; name: any; isVirtual?: boolean }) => ({
        label: printer.name,
        type: "radio",
        checked: printer.name === selectedPrinter,
        click: () => {
          if (printer.isVirtual) {
            if (printer.name === "None") {
              electronStore.delete("selectedPrinter");
              electronStore.delete("printerIP");
            } else {
              // Preview Mode
              electronStore.set("selectedPrinter", "Preview Mode");
              electronStore.delete("printerIP");
            }
          } else {
            electronStore.set("selectedPrinter", printer.name);
            const printerNumber = parseInt(
              printer.name.replace(/[^\d.]/g, ""),
              10
            );
            if (isNaN(printerNumber)) {
              console.log(
                `Unable to parse number from printer name: ${printer.name}`
              );
            } else {
              printerIp = "10.10.10." + printerNumber;
              electronStore.set("printerIP", printerIp);
            }
            console.log("selectedPrinter:", printer.ipAddress);
          }
          updatePrinterMenu(mainWindow);
        },
      })
    );

    const timeclockPrinterSubmenuItems = printers.map(
      (printer: { name: any }) => ({
        label: printer.name,
        type: "radio" as const,
        checked: printer.name === selectedTimeclockPrinter,
        click: () => {
          electronStore.set("selectedTimeclockPrinter", printer.name);
          updatePrinterMenu(mainWindow);
        },
      })
    );

    timeclockPrinterSubmenuItems.push({
      label: "None",
      type: "radio",
      checked: !selectedTimeclockPrinter,
      click: () => {
        electronStore.delete("selectedTimeclockPrinter");
        updatePrinterMenu(mainWindow);
      },
    });

    //submenu to set startup path
    const startupPathSubmenuItems = [
      {
        label: "Home",
        click: () => {
          electronStore.set("startupPath", "");
          mainWindow.loadURL(localURL);
        },
      },
      {
        label: "KDS",
        click: () => {
          electronStore.set("startupPath", "#kds");
          mainWindow.loadURL(localURL + "/#kds");
        },
      },
      {
        label: "KDS Pickup",
        click: () => {
          electronStore.set("startupPath", "#kds-pickup");
          mainWindow.loadURL(localURL + "/#kds-pickup");
        },
      },
      {
        label: "Kitchen POS",
        click: () => {
          electronStore.set("startupPath", "#pos-kitchen");
          mainWindow.loadURL(localURL + "/#pos-kitchen");
        },
      },
      {
        label: "POS",
        click: () => {
          electronStore.set("startupPath", "#pos");
          mainWindow.loadURL(localURL + "/#pos");
        },
      },
      {
        label: "KDS Recall",
        click: () => {
          electronStore.set("startupPath", "#kds-recall");
          mainWindow.loadURL(localURL + "/#kds-recall");
        },
      },
    ];


  

    const selfHostedURL = `https://localhost:${
      process.env.ELECTRON_PORT || 8901
    }`;

    const viewSubmenu = [
      {
        label: "Load Local Development Version",
        click: () => mainWindow.loadURL(localURL),
      },
      {
        label: "Load Hosted Version from Heroku",
        click: () => mainWindow.loadURL(hostedURL),
      },
      {
        label: "Start and Load Local Server",
        click: async () => {
          startServer(); // Start the server
          const serverReady = await checkServerReady(); // Wait until the server is ready
          if (serverReady) {
            mainWindow.loadURL(selfHostedURL);
          } else {
            dialog.showErrorBox("Error", "Failed to start local server.");
          }
        },
      },
    ];

    const settingsMenu = new Menu();
    settingsMenu.append(
      new MenuItem({
        label: "View",
        submenu: viewSubmenu,
      })
    );

    settingsMenu.append(
      new MenuItem({
        label: "Settings",
        submenu: [
          {
            label: "Toggle Fullscreen",
            accelerator:
              process.platform === "darwin" ? "Ctrl+Command+F" : "F11",
            click: () => {
              const isFullScreen = mainWindow.isFullScreen();
              mainWindow.setFullScreen(!isFullScreen);
            },
          },
          {
            label: "Clock-In Only Mode",
            type: "checkbox",
            checked: clockinOnlyMode,
            click: (menuItem: { checked: any }) => {
              const isClockinOnly = menuItem.checked;
              electronStore.set("clockinOnlyMode", isClockinOnly);
              //console.log("Clock-In Only Mode set to:", isClockinOnly);
            },
          },
          {
            label: "Photo Directory",
            click: () => {
              let photoDirectoryPath = dialog.showOpenDialogSync(mainWindow, {
                properties: ["openDirectory"],
              });
              if (photoDirectoryPath && photoDirectoryPath[0]) {
                electronStore.set("photoDirectory", photoDirectoryPath[0]);
                console.log("Photo directory selected:", photoDirectoryPath[0]);
              }
            },
          },
          {
            label: "Accounts",
            click: () => console.log("Open Accounts Settings"),
          },
          {
            label: "About",
            click: () => console.log("Open About Section"),
          },
          {
            label: "Printer",
            submenu: printerSubmenuItems,
          },
          {
            label: "Timeclock Printer",
            submenu: timeclockPrinterSubmenuItems,
          },
          {
            label: "Startup Path",
            submenu: startupPathSubmenuItems,
          },
          {
            label: "Toggle Developer Tools",
            accelerator:
              process.platform === "darwin" ? "Alt+Command+I" : "Ctrl+Shift+I",
            click: () => mainWindow.webContents.toggleDevTools(),
          },
        ],
      })
    );

    // Set the updated menu as the application menu
    Menu.setApplicationMenu(settingsMenu);
  };

  const updatePrinterMenu = async (mainWindow: {
    webContents: { getPrintersAsync: () => any };
  }) => {
    let printers = await mainWindow.webContents.getPrintersAsync();
    const selectedPrinter = electronStore.get("selectedPrinter");
    const selectedTimeclockPrinter = electronStore.get(
      "selectedTimeclockPrinter"
    );

    // Add None and Preview Mode to the printers array
    const allPrinterOptions = [
      ...printers,
      { name: "None", isVirtual: true },
      { name: "Preview Mode", isVirtual: true },
    ];

    const printerSubmenuItems = allPrinterOptions.map(
      (printer: { ipAddress?: any; name: any; isVirtual?: boolean }) => ({
        label: printer.name,
        type: "radio",
        checked: printer.name === selectedPrinter,
        click: () => {
          if (printer.isVirtual) {
            if (printer.name === "None") {
              electronStore.delete("selectedPrinter");
              electronStore.delete("printerIP");
            } else {
              // Preview Mode
              electronStore.set("selectedPrinter", "Preview Mode");
              electronStore.delete("printerIP");
            }
          } else {
            electronStore.set("selectedPrinter", printer.name);
            const printerNumber = parseInt(
              printer.name.replace(/[^\d.]/g, ""),
              10
            );
            if (isNaN(printerNumber)) {
              console.log(
                `Unable to parse number from printer name: ${printer.name}`
              );
            } else {
              printerIp = "10.10.10." + printerNumber;
              electronStore.set("printerIP", printerIp);
            }
            console.log("selectedPrinter:", printer.ipAddress);
          }
          updatePrinterMenu(mainWindow);
        },
      })
    );

    const timeclockPrinterSubmenuItems = printers.map(
      (printer: { ipAddress?: any; name: any }) => ({
        label: printer.name,
        type: "radio" as const,
        checked: printer.name === selectedTimeclockPrinter,
        click: () => {
          electronStore.set("selectedTimeclockPrinter", printer.name);
          updatePrinterMenu(mainWindow);
        },
      })
    );

    timeclockPrinterSubmenuItems.push({
      label: "None",
      type: "radio",
      checked: !selectedTimeclockPrinter,
      click: () => {
        electronStore.delete("selectedTimeclockPrinter");
        updatePrinterMenu(mainWindow);
      },
    });

    const existingMenu = Menu.getApplicationMenu();
    if (existingMenu) {
      const settingsMenu = existingMenu.items.find(
        (item: { label: string }) => item.label === "Settings"
      );
      if (settingsMenu) {
        const printerMenu = settingsMenu.submenu.items.find(
          (item: { label: string }) => item.label === "Printer"
        );
        const timeclockMenu = settingsMenu.submenu.items.find(
          (item: { label: string }) => item.label === "Timeclock Printer"
        );
        if (printerMenu) {
          printerMenu.submenu.clear();
          printerSubmenuItems.forEach((item: any) =>
            printerMenu.submenu.append(new MenuItem(item))
          );
        }
        if (timeclockMenu) {
          timeclockMenu.submenu?.clear();
          timeclockPrinterSubmenuItems.forEach((item: any) =>
            timeclockMenu.submenu?.append(new MenuItem(item))
          );
        }
      }
    }
  };

  // Usage
  createSettingsMenu(mainWindow);
});

// Other app event handlers and configuration...

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (serverProcess) {
    serverProcess.kill();
    console.log("Server process terminated");
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("get-clockin-only-mode", async () => {
  // Replace this with logic to retrieve the setting
  const clockinOnlyMode = electronStore.get("clockinOnlyMode", false); // Default to false
  return clockinOnlyMode;
});

// Define the ipcMain handlers here, not in preload.js
ipcMain.handle("dialog:openDirectory", async (event: any) => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if (filePaths.length > 0) {
    // Store the selected directory path
    const selectedDirectoryPath = filePaths[0];
    electronStore.set("directoryPath", selectedDirectoryPath);

    // Return the selected directory path to the renderer process
    return selectedDirectoryPath;
  } else {
    // Return null or an empty string if no directory was selected
    return null;
  }
});

ipcMain.handle("read-directory", async (event: any, directoryPath: any) => {
  return new Promise((resolve, reject) => {
    fs.readdir(
      directoryPath,
      { withFileTypes: true },
      (err: any, files: any[]) => {
        if (err) {
          reject(err);
        } else {
          const photos = files
            .filter(
              (dirent: { isFile: () => any; name: any }) =>
                dirent.isFile() &&
                path.extname(dirent.name).toLowerCase() === ".jpg"
            )
            .map((dirent: { name: any }) =>
              path.join(directoryPath, dirent.name)
            );
          resolve(photos);
        }
      }
    );
  });
});

ipcMain.handle("read-file-as-data-url", async (event: any, filePath: any) => {
  return new Promise((resolve) => {
    fs.readFile(
      filePath,
      { encoding: "base64" },
      (err: { code: string }, data: any) => {
        if (err) {
          // Check if the error is because the file doesn't exist
          if (err.code === "ENOENT") {
            // Resolve with a default value or message, for example, null or an error message
            // Optionally, you could resolve with a data URL of a default "not found" image
            resolve(null); // Or `resolve('data:image/jpeg;base64,DEFAULT_IMAGE_BASE64')` for a default image
          } else {
            // For other errors, you might still want to reject or handle differently
            console.error("Unexpected error reading file:", err);
            resolve(null); // Or handle as appropriate for your app
          }
        } else {
          const mimeType = "image/jpeg"; // Assuming JPEG photos
          resolve(`data:${mimeType};base64,${data}`);
        }
      }
    );
  });
});

ipcMain.handle("get-stored-directory-path", async () => {
  return electronStore.get("directoryPath", ""); // Get the directory path, default to an empty string if not set
});

ipcMain.handle(
  "write-file",
  async (event: any, fileName: string, data: Buffer | string) => {
    const directoryPath = electronStore.get("directoryPath", "");
    if (!directoryPath) {
      return "Directory path is not set";
    }

    // Construct the full file path
    const filePath = path.join(directoryPath, fileName);

    // Ensure the file path is within the allowed directory
    if (!filePath.startsWith(directoryPath)) {
      return "Unauthorized file path";
    }

    const buffer = Buffer.from(data);

    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, buffer, (err: any) => {
        if (err) {
          console.error("Error writing file:", err);
          reject(err);
        } else {
          resolve("File written successfully");
        }
      });
    });
  }
);

let lastOrder: Types.ExtendedLineItem[] = [];
let lastTransactions: Types.Transaction[] = [];
let lastOrderNumber = 0;
let lastOrderId = 0;
let lastTotalTax = 0;
let lastDiscountCodes: Types.DiscountCode[] = [];
let lastSubtotalPrice = 0;
let lastTotalPrice = 0;
let lastCustomer = {};

ipcMain.handle("open-drawer", async () => {
  const client = new net.Socket();
  
  // Set a reasonable timeout (e.g., 3 seconds)
  client.setTimeout(3000);
  
  client.on('error', () => {
    client.destroy();
  });

  client.on('timeout', () => {
    client.destroy();
  });

  try {
    client.connect(port, printerIp, () => {
      client.write(openDrawerCommand, () => {
        client.destroy();
      });
    });
  } catch (error) {
    client.destroy();
  }
});

ipcMain.handle("reprint-last-order", async () => {
  if (!lastOrderId) return "No order to reprint";
  try {
    await printReceipt(
      lastOrder,
      lastTransactions,
      lastOrderNumber,
      lastOrderId,
      lastTotalTax,
      lastDiscountCodes,
      lastSubtotalPrice,
      lastTotalPrice,
      lastCustomer
    );
    return "Print command sent";
  } catch (error) {
    console.error("Error occurred while trying to reprint:", error);
    return "Print command failed";
  }
});

ipcMain.handle(
  "print-order",
  async (
    e: any,
    order: Types.ExtendedLineItem[],
    transactions: Types.Transaction[],
    orderNumber: number,
    orderId: number,
    totalTax: number,
    discountCodes: Types.DiscountCode[],
    subtotalPrice: number,
    totalPrice: number,
    customer: any
  ) => {
    lastOrder = order;
    lastTransactions = transactions;
    lastOrderNumber = Number(orderNumber);
    lastOrderId = Number(orderId);
    lastTotalTax = Number(totalTax);
    lastDiscountCodes = discountCodes;
    lastSubtotalPrice = Number(subtotalPrice);
    lastTotalPrice = Number(totalPrice);
    lastCustomer = customer;

    try {
      await printReceipt(
        order,
        transactions,
        Number(orderNumber),
        Number(orderId),
        Number(totalTax),
        discountCodes,
        Number(subtotalPrice),
        Number(totalPrice),
        customer
      );
      return "Print command sent";
    } catch (error) {
      console.error("Error occurred while trying to print:", error);
      return "Print command failed";
    }
  }
);

function printReceipt(
  order: Types.ExtendedLineItem[],
  transactions: Types.Transaction[],
  orderNumber: number,
  orderId: number,
  totalTax: number,
  discountCodes: Types.DiscountCode[],
  subtotalPrice: number,
  totalPrice: number,
  customer: any
) {
  let printerName = electronStore.get("selectedPrinter");
  if (!printerName) {
    //console.log("No printer is selected.");
    return;
  }
  if (!printerName) {
    //console.error("Printer name not set in electronStore");
    return "Printer name not set in electronStore";
  }
  const options: PosPrintOptions = {
    copies: 1,
    printerName: printerName,
    timeOutPerLine: 400,
    pageSize: "80mm",
    silent: true,
    dpi: { horizontal: 180, vertical: 180 },
    //scaleFactor: 0.95,
    margin: "5px 5px 5px 5px",
    preview: printerName == "Preview Mode" ? true : false,
    boolean: undefined,
  };

  console.log("new transactions: ", transactions);

  // Initialize the data array with the image header
  let data: PosPrintData[] = [];

  let tabAmount = 0;

  transactions.forEach((transaction) => {
    if (transaction.gateway == "Tab") {
      tabAmount += transaction.amount || 0;
    }
  });

  if (
    (tabAmount > 0 || customer?.tags?.includes("employee")) &&
    customer.first_name
  ) {
    data.push({
      type: "text",
      value: `${customer.first_name} ${customer.last_name}`,
      style: {
        textAlign: "center",
        fontWeight: "400",
        fontFamily: "Calibri",
        fontSize: "30px",
      },
    });
  }

  data.push({
    type: "image",
    path: path.join(__dirname, "images", "longlogo.png"),
    width: "80vw",
    position: "center",
  });

  data.push({
    type: "text",
    value: "1218 N Camp St\nSeguin, TX 78155\n\n",
    style: {
      textAlign: "center",
      fontWeight: "400",
      fontFamily: "Calibri",
      fontSize: "15px",
    },
  });

  // Initialize tableBody for itemized receipt entries
  let tableBody: any = [];
  let subtotal = 0;

  // Populate tableBody and calculate subtotal
  order.forEach((item) => {
    let line = [
      {
        type: "text",
        value: `${item.quantity}`,
        style: {
          textAlign: "left",
          fontWeight: "400",
          padding: "0",
          margin: "0",
          border: "0",
        },
      },
      {
        type: "text",
        value: `${item.title} @$${Number(
          item.fullPrice || item.price || 0
        ).toFixed(2)}`,
        style: {
          textAlign: "left",
          fontWeight: "400",
          padding: "0",
          margin: "0",
          border: "0",
        },
      },
      {
        type: "text",
        value: `${(item.fullPrice || item.price || 0) < 0 ? "(" : ""}$${Number(
          (item.fullPrice || item.price || 0) * (item.quantity || 0) || 0
        ).toFixed(2)}${(item.fullPrice || item.price || 0) < 0 ? ")" : ""}`,
        style: {
          textAlign: "right",
          fontWeight: "400",
          padding: "0",
          margin: "0",
          border: "0",
        },
      },
    ];

    tableBody.push(line);
    item.properties?.forEach((property) => {
      tableBody.push([
        "",
        {
          type: "text",
          value: `${
            !property.name.toLowerCase().includes("mod")
              ? `${property.name}: `
              : ""
          } ${property.value}`,
          style: {
            textAlign: "left",
            fontWeight: "400",
            padding: "0",
            margin: "0",
            border: "0",
          },
        },
        property.addPrice && item.quantity && property.addPrice !== 0
          ? {
              type: "text",
              value: `${property.addPrice < 0 ? "(" : ""}$${Number(
                Math.abs(property.addPrice || 0) * (item.quantity || 0) || 0
              ).toFixed(2)}${property.addPrice < 0 ? ")" : ""}`,
              style: {
                textAlign: "right",
                fontWeight: "400",
                padding: "0",
                margin: "0",
                border: "0",
              },
            }
          : "",
      ]);
    });
    if (item.quantity && item.price) {
      subtotal += item.quantity * item.price;
    }
  });

  const subtotalPreDiscount = subtotal + 0;

  discountCodes.forEach((discount) => {
    let discountValue: number = 0;

    if (discount.type == "fixed_amount" && discount.amount)
      discountValue = Number(discount.amount);
    if (discount.type == "percentage" && discount.amount)
      discountValue = (subtotalPreDiscount * Number(discount.amount)) / 100;
    subtotal -= discountValue;

    tableBody.push([
      {
        type: "text",
        value: "",
        style: {
          textAlign: "left",
          fontWeight: "400",
          fontSize: "8px",
          padding: "0",
          margin: "0",
          border: "0",
        },
      },
      {
        type: "text",
        value: `${discount.code}`,
        style: {
          textAlign: "right",
          fontWeight: "400",
          fontSize: "10px",
          padding: "0",
          margin: "0",
          border: "0",
        },
      },
      {
        type: "text",
        value: `($${Number(discountValue || 0).toFixed(2) || "0.00"})`,
        style: {
          textAlign: "right",
          fontWeight: "400",
          padding: "0",
          margin: "0",
          border: "0",
        },
      },
    ]);
  });

  // Calculate total (example with a fixed tax rate for simplicity)
  const taxAmount: number = Number(totalTax);
  const total: number = subtotal + taxAmount;

  tableBody.push([
    {
      type: "text",
      value: "",
      style: {
        textAlign: "left",
        fontSize: "8px",
        padding: "0",
        margin: "0",
        border: "0",
      },
    },
    {
      type: "text",
      value: "SUBTOTAL",
      style: {
        textAlign: "right",
        fontSize: "10px",
        padding: "0",
        margin: "0",
        border: "0",
      },
    },
    {
      type: "text",
      value: `${(subtotalPrice || 0) < 0 ? "(" : ""}$${Math.abs(
        subtotalPrice || 0
      ).toFixed(2)}${(subtotalPrice || 0) < 0 ? ")" : ""}`,
      style: { textAlign: "right", padding: "0", margin: "0", border: "0" },
    },
  ]);
  tableBody.push([
    {
      type: "text",
      value: "",
      style: {
        textAlign: "left",
        fontSize: "8px",
        padding: "0",
        margin: "0",
        border: "0",
      },
    },
    {
      type: "text",
      value: "TAX",
      style: {
        textAlign: "right",
        fontSize: "10px",
        padding: "0",
        margin: "0",
        border: "0",
      },
    },
    {
      type: "text",
      value: `${(taxAmount || 0) < 0 ? "(" : ""}$${Math.abs(
        taxAmount || 0
      ).toFixed(2)}${(taxAmount || 0) < 0 ? ")" : ""}`,
      style: { textAlign: "right", padding: "0", margin: "0", border: "0" },
    },
  ]);
  tableBody.push([
    {
      type: "text",
      value: "",
      style: {
        textAlign: "left",
        fontSize: "8px",
        padding: "0",
        margin: "0",
        border: "0",
      },
    },
    {
      type: "text",
      value: "TOTAL",
      style: {
        textAlign: "right",
        fontSize: "10px",
        padding: "0",
        margin: "0",
        border: "0",
      },
    },
    {
      type: "text",
      value: `${(totalPrice || 0) < 0 ? "(" : ""}$${Math.abs(
        totalPrice || 0
      ).toFixed(2)}${(totalPrice || 0) < 0 ? ")" : ""}`,
      style: { textAlign: "right", padding: "0", margin: "0", border: "0" },
    },
  ]);

  transactions.forEach((transaction) => {
    if (transaction.kind && transaction.kind === "change") {
      tableBody.push([
        {
          type: "text",
          value: "",
          style: {
            textAlign: "left",
            fontSize: "8px",
            padding: "0",
            margin: "0",
            border: "0",
          },
        },
        {
          type: "text",
          value: `Change Due`,
          style: {
            textAlign: "right",
            fontSize: "10px",
            padding: "0",
            margin: "0",
            border: "0",
          },
        },
        {
          type: "text",
          value: `($${(transaction.amount || 0).toFixed(2)})`,
          style: {
            textAlign: "right",
            fontWeight: "400",
            padding: "0",
            margin: "0",
            border: "0",
          },
        },
      ]);
    } else {
      tableBody.push([
        {
          type: "text",
          value: "",
          style: {
            textAlign: "left",
            fontSize: "8px",
            padding: "0",
            margin: "0",
            border: "0",
          },
        },
        {
          type: "text",
          value: `${transaction.gateway}`,
          style: {
            textAlign: "right",
            fontSize: "10px",
            padding: "0",
            margin: "0",
            border: "0",
          },
        },
        {
          type: "text",
          value: `${(transaction.amount || 0) < 0 ? "(" : ""}$${Math.abs(
            transaction.amount || 0
          ).toFixed(2)}${(transaction.amount || 0) < 0 ? ")" : ""}`,
          style: {
            textAlign: "right",
            fontWeight: "400",
            padding: "0",
            margin: "0",
            border: "0",
          },
        },
      ]);
    }
  });

  data.push({
    type: "table",
    style: { border: "0", width: "95%", margin: "0px", fontFamily: "Calibri" },
    tableHeader: [
      {
        type: "text",
        value: `#`,
        style: {
          textAlign: "right",
          fontSize: "15px",
          padding: "0",
          margin: "0",
        },
      },
      {
        type: "text",
        value: `${orderNumber.toString().slice(-3)}`,
        style: {
          textAlign: "left",
          fontSize: "15px",
          padding: "0",
          margin: "0",
        },
      },
    ],
    tableBody: tableBody,
    tableFooter: ["", "", ""],
    tableHeaderStyle: {
      textAlign: "center",
      fontSize: "15px",
      fontWeight: "bold",
      padding: "0",
      margin: "0",
      border: "0",
    },
    tableBodyStyle: {
      border: "0",
      fontSize: "13px",
      fontWeight: "bold",
      padding: "0",
      margin: "0",
    },
    tableFooterStyle: { textAlign: "left", fontSize: "15px" },
  });

  /* upgrade wristband to a membership (disabled temporarily)
  // Find the average price of all items in the order that are "Unlimited Wristband"s
  let foundItems = order.filter(
    (item) =>
      item.title?.includes("Unlimited Wristband") ||
      item.title?.includes("Indoor Wristband")
  );
  //console.log("foundItems", foundItems);
  if (foundItems.length > 0) {
    // Using flatMap to repeat each item based on its quantity
    foundItems = foundItems.flatMap((item) => {
      // Ensure quantity is a positive number
      let quantity = item.quantity || 0;
      quantity = Math.max(quantity, 0);

      // Create an array of the same item repeated 'quantity' times
      return Array.from({ length: quantity }, () => ({ ...item, quantity: 1 }));
    });
    //console.log("foundItems flat", foundItems);
    const sum = foundItems.reduce(
      (sum, item) => sum + parseFloat((item.price as unknown as string) || "0"),
      0
    );
    //console.log("sum", sum);
    const averagePrice = Math.round((sum / foundItems.length) * 100) / 100;
    const expirationDate = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

    if (averagePrice > 0) {
      data.push({
        type: "text",
        value: `Scan the QR Code below to get $${averagePrice} OFF 
				when you upgrade up to ${foundItems.length} Wristband${
          foundItems.length > 1 ? "s" : ""
        } 
				to ${foundItems.length == 1 ? "a" : ""} membership${
          foundItems.length > 1 ? "s" : ""
        }!`,
        style: {
          textAlign: "center",
          fontSize: "12px",
          fontFamily: "Calibri",
          fontWeight: "bold",
          margin: "0px 10px 0px 10px",
        },
      });

      data.push({
        type: "qrCode",
        value: `zdtamusement.com/discount/${orderNumber}?e=${expirationDate}&c=${orderNumber}&d=${averagePrice}&l=memberships&m=${foundItems.length}`,
        height: "150",
        width: "150",
        position: "center",
        displayValue: true,
      });

      data.push({
        type: "text",
        value: `Or signup for a membership online and use discount code ${orderNumber} at checkout.`,
        style: {
          textAlign: "center",
          fontSize: "12px",
          fontFamily: "Calibri",
          fontWeight: "bold",
          margin: "0px 10px 0px 10px",
        },
      });
      data.push({
        type: "text",
        value: "(this offer is only valid for 24 hours)",
        style: {
          textAlign: "center",
          fontSize: "10px",
          fontFamily: "Calibri",
          fontWeight: "bold",
        },
      });
    }
  }
  */

  data.push({
    type: "text",
    value: "Terms of Admission: https://zdtamusement.com/pages/terms",
    style: {
      textAlign: "center",
      fontSize: "12px",
      fontFamily: "Calibri",
      fontWeight: "800",
    },
  });

  data.push({
    type: "text",
    value: `REF#${orderNumber}`,
    style: {
      textAlign: "center",
      fontSize: "12px",
      fontFamily: "Calibri",
      fontWeight: "800",
    },
  });

  const datestring = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  //string with current time and date:
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  const timeanddate = datestring + " " + time;

  data.push({
    type: "text",
    value: timeanddate, //time and date of printing
    style: {
      textAlign: "center",
      fontSize: "12px",
      fontFamily: "Calibri",
      fontWeight: "800",
    },
  });

  try {
    PosPrinter.print(data, options)
      .then(() => console.log("Receipt printing completed successfully."))
      .catch((error: any) => {
        console.error("Failed to print receipt:", error);
      });
  } catch (e) {
    console.error("An error occurred while trying to print the receipt:", e);
  }
}

async function printKdsTicket(kdsOrder: Types.KDSOrder) {
  // Get the printer for KDS tickets; you may have a dedicated printer key.
  let printerName = electronStore.get("selectedPrinter");
  if (!printerName) {
    console.error("No printer is selected.");
    return "No printer is selected.";
  }

  const options = {
    copies: 1,
    printerName: printerName,
    timeOutPerLine: 400,
    pageSize: "80mm",
    silent: true,
    dpi: { horizontal: 180, vertical: 180 },
    margin: "5px 5px 5px 5px",
    preview: printerName === "Preview Mode",
    boolean: undefined,
  };

  // Build the data to send to the printer.
  const data = [];



  // Add header: Customer name (if available)
  if (kdsOrder.name) {
    data.push({
      type: "text",
      value: kdsOrder.name,
      style: {
        textAlign: "center",
        fontWeight: "bold",
        fontFamily: "Calibri",
        fontSize: "30px", // Larger text for the kitchen
      },
    });
  } else if (kdsOrder.order_number) {
    data.push({
      type: "text",
      value: `Order #${kdsOrder.order_number}`,
      style: {
        textAlign: "center",
        fontWeight: "bold",
        fontFamily: "Calibri",
        fontSize: "30px",
      },
    });
  } else{
    //blank spacer line if no name to write in a name
    data.push({
      type: "text",
      value: "\u200B",
      style: {
        textAlign: "center",
        fontWeight: "bold",
        fontFamily: "Calibri",
        fontSize: "30px",
      },
    });
  }

  data.push({
    type: "text",
    value: "-----------------------------",
    style: {
      textAlign: "center",
      fontWeight: "bold",
      fontFamily: "Calibri",
      fontSize: "30px",
    },
  })

    let lines = 0;
  
  // List each KDS item along with special instructions
  // Use larger font sizes for easy readability.
  kdsOrder?.items?.forEach((item) => {
    // Print item name and quantity
    lines += 1;
    data.push({
      type: "text",
      value: `${item.item_name} ${item.quantity > 1 ? `x ${item.quantity}` : ""}`,
      style: {
        textAlign: "left",
        fontWeight: "bold",
        fontFamily: "Calibri",
        fontSize: "25px",
      },
    });

    // If there are special instructions, print them below the item line
    if (item.special_instructions) {
      const instructions = item.special_instructions
        .split(",")
        .map((instruction) => instruction.split(":")[1]?.trim() || instruction)
        .map((instruction) => ({ 
          type: "text", 
          value: `   ${instruction}`,
          style: { 
            textAlign: "left", 
            fontFamily: "Calibri", 
            fontSize: "25px" 
          } 
        }));
      data.push(...instructions);
      lines += instructions.length;
    }
  });

  while (lines < 6) {
    lines += 1;
    data.push({
      type: "text",
      value: "\u200B", // Zero-width space
      style: {
        textAlign: "center",
        fontFamily: "Calibri",
        fontSize: "25px",
      },
    });
  }

  // Optionally, add the current date and time at the bottom for reference.
  const now = new Date().toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  data.push({
    type: "text",
    value: now,
    style: {
      textAlign: "center",
      fontFamily: "Calibri",
      fontSize: "10px",
      fontWeight: "bold",
    },
  });

  try { 
    await PosPrinter.print(data as PosPrintData[], options as PosPrintOptions);
    //console.log("KDS Ticket printing completed successfully.");
  } catch (error) {
    console.error("An error occurred while trying to print the KDS Ticket:", error);
    return "KDS Ticket print command failed";
  }
}

// Then register an IPC handler so the renderer process can call this function.
ipcMain.handle("print-kds-ticket", async (_event: Event, kdsOrder: Types.KDSOrder) => {
  try {
    await printKdsTicket(kdsOrder);
    return "KDS Ticket print command sent";
  } catch (error) {
    console.error("Error occurred while trying to print the KDS Ticket:", error);
    return "KDS Ticket print command failed";
  }
});

ipcMain.handle(
  "print-timeclock-receipt",
  async (_e: Event, name: string, clockEntries: any[]) => {
    try {
      await printTimeclockReceipt(name, clockEntries);
      return "Clock-in receipt print command sent";
    } catch (error) {
      console.error(
        "Error occurred while trying to print clock-in receipt:",
        error
      );
      return "Clock-in receipt print command failed";
    }
  }
);
interface ClockEntry {
  id: number;
  clock_in: string;
  clock_out: string | null;
}

async function printTimeclockReceipt(
  name: string,
  clockEntriesInput: ClockEntry[]
): Promise<void> {
  const printerName: string | undefined = electronStore.get(
    "selectedTimeclockPrinter"
  );
  if (!printerName) {
    console.log("No printer is selected.");
    return;
  }

  const options: PosPrintOptions = {
    copies: 1,
    printerName: printerName,
    timeOutPerLine: 400,
    pageSize: "80mm",
    silent: true,
    dpi: { horizontal: 180, vertical: 180 },
    margin: "5px 5px 5px 5px",
    preview: printerName === "Preview Mode" ? true : false,
    boolean: undefined,
  };

  const calculateDuration = (
    clockIn: string,
    clockOut: string | null
  ): string => {
    if (!clockIn || !clockOut) return "";

    const inTime = new Date(clockIn).getTime();
    const outTime = new Date(clockOut).getTime();

    const diff = outTime - inTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours > 0 ? `${hours}h ` : ""}${minutes}m`;
  };

  const sortedEntries: ClockEntry[] = clockEntriesInput.sort(
    (a, b) => b.id - a.id
  );
  if (!sortedEntries.length) return console.error("No valid entries to print.");

  const currentEntry = sortedEntries[0];

  // Format timestamps with timezone
  const timeZone = "America/Chicago"; // Replace with your desired timezone
  const clockInTime = new Date(currentEntry.clock_in).toLocaleString("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const clockOutTime = currentEntry.clock_out
    ? new Date(currentEntry.clock_out).toLocaleString("en-US", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "Still Clocked In";

  const duration = currentEntry.clock_out
    ? calculateDuration(currentEntry.clock_in, currentEntry.clock_out)
    : "";

  const heading = currentEntry.clock_out
    ? "Clock Out Receipt"
    : "Clock In Receipt";

  const data: PosPrintData[] = [
    {
      type: "image",
      path: path.join(__dirname, "images", "longlogo.png"),
      width: "80vw",
      position: "center",
    },
    {
      type: "text",
      value: heading,
      style: { textAlign: "center", fontWeight: "bold", fontSize: "20px" },
    },
    {
      type: "text",
      value: name,
      style: { textAlign: "center", fontSize: "18px" },
    },
    {
      type: "text",
      value: `${clockInTime}${
        currentEntry.clock_out ? ` - ${clockOutTime}` : ""
      }`,
      style: { textAlign: "center", fontSize: "25px" },
    },
    {
      type: "text",
      value: duration,
      style: { textAlign: "center", fontSize: "16px" },
    },
  ];

  // Add current date and time at the bottom
  const now = new Date();
  const formattedNow = now.toLocaleString("en-US", {
    timeZone,
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  data.push({
    type: "text",
    value: formattedNow,
    style: {
      textAlign: "center",
      fontSize: "12px",
      fontFamily: "Calibri",
      fontWeight: "800",
    },
  });

  try {
    await PosPrinter.print(data, options);
    console.log("Receipt printing completed successfully.");
  } catch (error) {
    console.error(
      "An error occurred while trying to print the receipt:",
      error
    );
  }
}
