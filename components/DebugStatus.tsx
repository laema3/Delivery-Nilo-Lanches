import React, { useState, useEffect } from 'react';
import { db, connectionError, firebaseConfig } from '../firebaseConfig.ts';

export const DebugStatus: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  
  if (!isVisible) return null;

  const hasKeys = !!firebaseConfig.apiKey;
  const isConnected = !!db;

  return (
    <div className="fixed top-0 left-0 w-full bg-slate-900 text-white z-[9999] p-4 font-mono text-xs border-b-4 border-yellow-500 shadow-xl">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-yellow-400">🛠️ PAINEL DE DIAGNÓSTICO (FIREBASE)</h3>
          <button onClick={() => setIsVisible(false)} className="bg-red-600 px-3 py-1 rounded text-white hover:bg-red-700">Fechar X</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status das Chaves */}
          <div className={`p-3 rounded border ${hasKeys ? 'bg-emerald-900/50 border-emerald-500' : 'bg-red-900/50 border-red-500'}`}>
            <strong className="block mb-2 text-sm uppercase">1. Leitura do .env</strong>
            <p>API Key: {firebaseConfig.apiKey ? <span className="text-emerald-400">Encontrada ✅</span> : <span className="text-red-400 animate-pulse">NÃO ENCONTRADA ❌</span>}</p>
            <p>Project ID: {firebaseConfig.projectId ? <span className="text-emerald-400">{firebaseConfig.projectId} ✅</span> : <span className="text-red-400">NÃO ENCONTRADO ❌</span>}</p>
            {!hasKeys && (
              <p className="mt-2 text-yellow-200">
                Ação: Verifique se o arquivo chama-se exatamente <code>.env</code> e se está na raiz do projeto. Reinicie o terminal.
              </p>
            )}
          </div>

          {/* Status da Conexão */}
          <div className={`p-3 rounded border ${isConnected ? 'bg-emerald-900/50 border-emerald-500' : 'bg-red-900/50 border-red-500'}`}>
            <strong className="block mb-2 text-sm uppercase">2. Conexão Firebase</strong>
            <p>Objeto DB: {db ? <span className="text-emerald-400">Criado ✅</span> : <span className="text-red-400">Nulo ❌</span>}</p>
            {connectionError && (
              <div className="mt-2 bg-red-950 p-2 rounded text-red-200 break-all">
                Erro: {connectionError}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-slate-400">Se tudo estiver verde acima, o banco está conectado.</p>
        </div>
      </div>
    </div>
  );
};
