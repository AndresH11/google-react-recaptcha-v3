declare global {
  interface Window {
    grecaptcha?: {
      execute(siteKey: string, options: { action: string }): Promise<string>;
      ready(callback: () => void): void;
      getResponse?(widgetId?: number): string;
      reset?(widgetId?: number): void;
    };
  }
}

// Esto es necesario para que TypeScript reconozca el archivo como un módulo
export {};
