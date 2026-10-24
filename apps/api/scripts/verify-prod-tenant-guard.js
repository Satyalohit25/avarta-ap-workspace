process.env.NODE_ENV = 'production';
const { prisma } = require('../src/config/database');
const { updateInvoice } = require('../src/modules/invoices/service');

async function test() {
  try {
    const inv = await prisma.invoice.findFirst();
    if (!inv) {
      console.log('No invoice found');
      return;
    }
    console.log('Testing updateInvoice with NODE_ENV=production on invoice:', inv.id, inv.organizationId);
    await updateInvoice({
      organizationId: inv.organizationId,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber
    });
    console.log('SUCCESS! (Did not throw)');
  } catch (err) {
    console.error('CAUGHT ERROR WITH STACK:');
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
