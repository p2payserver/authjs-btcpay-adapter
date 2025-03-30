import crypto from "crypto";

export default defineNitroPlugin((nitroApp) => {
  // Generates a random 24-character hexadecimal id.
  const generateId = () => crypto.randomBytes(12).toString("hex");

    /**
   * BTCPay Adapter for Auth.js / NextAuth.js.
   *
   * Options should include:
   *  - storeIds: an object mapping collection names to your BTCPay store IDs:
   *      { Users: "storeUserId", Sessions: "storeStoreId", VerificationTokens: "storeVTId" }
   *  - btcpayClient: an instance (or a function returning one) that implements the BTCPay API methods.
   *
   * The adapter uses invoices as documents. The invoice.orderId holds the document's id,
   * and invoice.metadata holds the JSON data.
   */
  const BTCPayAdapter = (btcpayClient, options = {}) => {
    const { storeIds } = options;
    if (!storeIds || !storeIds.Users || !storeIds.Sessions || !storeIds.VerificationTokens) {
      throw new Error("You must supply storeIds for Users, Sessions, and VerificationTokens.");
    }

    // Helper to create a new document (invoice) in the specified store.
    const createDocument = async (store, data) => {
      if (!data.id) data.id = generateId();
      const invoiceData = {
        orderId: data.id,
        metadata: data, // The BTCPay client is expected to handle serialization.
      };
      await btcpayClient.createInvoice(store, invoiceData);
      return data;
    };

    // Helper to fetch a document by its id from the specified store.
    const getDocument = async (store, id) => {
      const invoice = await btcpayClient.getInvoiceByOrderId(store, id);
      return invoice ? invoice.metadata : null;
    };

    // Helper to update a document.
    const updateDocument = async (store, id, data) => {
      const updatedInvoice = await btcpayClient.updateInvoice(store, id, { metadata: data });
      return updatedInvoice.metadata;
    };

    // Helper to "delete" a document by archiving its invoice.
    const deleteDocument = async (store, id) => await btcpayClient.archiveInvoice(store, id);

    // Helper to search for a document by a field in its metadata.
    const findDocumentByField = async (store, field, value) => {
      const invoice = await btcpayClient.findInvoiceByMetadata(store, field, value);
      return invoice ? invoice.metadata : null;
    };

    return {
      createUser: async (data) => await createDocument(storeIds.Users, data),

      getUser: async (id) => await getDocument(storeIds.Users, id),

      getUserByEmail: async (email) =>
        await findDocumentByField(storeIds.Users, "email", email),

      // Since each user has only one account, these methods are no-ops.
      getUserByAccount: async (_data) => null,

      updateUser: async (data) => {
        if (!data.id) throw new Error("User must have an id to update.");
        return await updateDocument(storeIds.Users, data.id, data);
      },

      deleteUser: async (id) => {
        await deleteDocument(storeIds.Users, id);
        // Optionally archive all sessions and verification tokens related to this user.
        await btcpayClient.archiveInvoicesByMetadata(storeIds.Sessions, "userId", id);
        await btcpayClient.archiveInvoicesByMetadata(storeIds.VerificationTokens, "userId", id);
      },

      linkAccount: async (data) => data,

      unlinkAccount: async (data) => data,

      getSessionAndUser: async (sessionToken) => {
        const session = await findDocumentByField(storeIds.Sessions, "sessionToken", sessionToken);
        if (!session) return null;
        const user = await getDocument(storeIds.Users, session.userId);
        return user ? { session, user } : null;
      },

      createSession: async (data) => await createDocument(storeIds.Sessions, data),

      updateSession: async (data) => {
        if (!data.id) throw new Error("Session must have an id to update.");
        return await updateDocument(storeIds.Sessions, data.id, data);
      },

      deleteSession: async (sessionToken) => {
        const session = await findDocumentByField(storeIds.Sessions, "sessionToken", sessionToken);
        if (!session) return null;
        await deleteDocument(storeIds.Sessions, session.id);
        return session;
      },

      createVerificationToken: async (data) =>
        await createDocument(storeIds.VerificationTokens, data),

      useVerificationToken: async (data) => {
        // Assume `data` includes fields such as "identifier" and "token".
        const invoice = await btcpayClient.findInvoiceByMetadata(
          storeIds.VerificationTokens,
          "identifier",
          data.identifier
        );
        if (!invoice || invoice.metadata.token !== data.token) return null;
        await deleteDocument(storeIds.VerificationTokens, invoice.metadata.id);
        return invoice.metadata;
      },
    };
  };

  nitroApp.BTCPayAdapter = BTCPayAdapter;
});

  