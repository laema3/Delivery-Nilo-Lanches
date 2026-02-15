
export const notificationService = {
  async requestPermission() {
    if (!('Notification' in window)) {
      alert('Este navegador não suporta notificações do sistema.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('🔔 Permissão de notificação concedida!');
        return true;
      } else {
        console.warn('🔕 Permissão de notificação negada pelo usuário.');
        return false;
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      return false;
    }
  },

  async sendNotification(title: string, body: string, icon?: string) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      console.log('Aviso: Notificação ignorada (Sem permissão ou suporte).');
      return;
    }

    const options: any = {
      body,
      icon: icon || 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png',
      vibrate: [200, 100, 200],
      tag: 'order-status-update',
      renotify: true,
      requireInteraction: true,
      data: {
        url: window.location.origin + '/my-orders'
      }
    };

    try {
      // Tenta enviar via Service Worker (obrigatório para background no Android/PWA)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && 'showNotification' in registration) {
          await registration.showNotification(title, options);
          return;
        }
      }
      
      // Fallback para notificação desktop simples
      new Notification(title, options);
    } catch (e) {
      console.error('Falha ao disparar notificação:', e);
      // Última tentativa: Notificação nativa simples
      try { new Notification(title, options); } catch(e2) {}
    }
  }
};
