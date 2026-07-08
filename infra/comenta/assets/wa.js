/* ============================================================
   ►►►  NÚMERO OFICIAL DO WHATSAPP DA COMENTA  ◄◄◄
   TROQUE APENAS A LINHA ABAIXO. É o ÚNICO lugar do site inteiro.
   Formato: só dígitos, com 55 (país) + DDD. Ex.: 5565999990000
   (Hoje está um número de teste. O número NÃO aparece na tela —
    só vira o link "wa.me". Depois de trocar aqui, todas as páginas
    — home e produtos — passam a usar o número novo automaticamente.)
   ============================================================ */
window.COMENTA_WA = "5565999900005";

/* Helper usado por todas as páginas. Não precisa mexer. */
window.waLink = function (txt) {
  return "https://wa.me/" + window.COMENTA_WA + "?text=" + encodeURIComponent(txt || "");
};
