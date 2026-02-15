
export const notificationService = {
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Este navegador não suporta notificações de desktop');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  },

  sendNotification(title: string, body: string, icon?: string) {
    if (Notification.permission === 'granted') {
      const options = {
        body,
        icon: icon || 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png',
        vibrate: [200, 100, 200],
        tag: 'order-status-update',
        renotify: true
      };

      // Dispara a notificação
      new Notification(title, options);

      // Se estiver no Android via Capacitor, poderíamos usar LocalNotifications.schedule
      // Mas a Web API já cobre a maioria dos casos PWA.
    }
  }
};
