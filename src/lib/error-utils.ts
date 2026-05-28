import { toast } from "sonner";

/**
 * World-Class Error Handling Layer
 * Captura, formata e reporta erros de forma resiliente.
 */
export const ErrorHandler = {
  /**
   * Reporta um erro para a UI e console de telemetria.
   */
  report: (error: unknown, context: string) => {
    const message = error instanceof Error ? error.message : String(error);
    const timestamp = new Date().toISOString();
    
    console.error(`[TELEMETRY][${timestamp}][${context}]:`, error);
    
    // User-friendly mapping
    if (message.includes("network") || message.includes("fetch")) {
      toast.error("Erro de conexão. Verifique sua rede.");
    } else if (message.includes("permission") || message.includes("JWT")) {
      toast.error("Sua sessão expirou. Por favor, faça login novamente.");
    } else {
      toast.error(`Falha em ${context}: ${message}`);
    }
  },

  /**
   * Wrapper para capturar erros em funções assíncronas.
   */
  async wrap<T>(promise: Promise<T>, context: string): Promise<T | null> {
    try {
      return await promise;
    } catch (error) {
      this.report(error, context);
      return null;
    }
  }
};
