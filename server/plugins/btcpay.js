export default defineNitroPlugin((nitroApp) => {
  /**
   * BTCPayClient provides methods to create, fetch, update, and archive invoices
   * using the BTCPayServer Greenfield API. It automatically wraps outgoing
   * payloads inside a `metadata` property and unwraps incoming responses so that
   * the document value is directly returned.
   *
   * The factory function accepts an object with:
   *  - baseUrl: The base URL of your BTCPay Server.
   *  - apiKey: Your BTCPay API key.
   *  - userStoreId: The store ID for user invoices.
   *  - sessionStoreId: The store ID for session invoices.
   *  - verificationTokenStoreId: The store ID for verification token invoices.
   *
   * The returned object provides three properties:
   *  - user: Methods for operations on the user store.
   *  - session: Methods for operations on the session store.
   *  - verificationToken: Methods for operations on the verification token store.
   */
  const BTCPayClient = ({
    baseUrl,
    apiKey,
    userStoreId,
    sessionStoreId,
    verificationTokenStoreId,
  }) => {
    // Remove trailing slashes from baseUrl.
    const _baseUrl = baseUrl.replace(/\/+$/, "");
    const _apiKey = apiKey;
    const _userStoreId = userStoreId;
    const _sessionStoreId = sessionStoreId;
    const _verificationTokenStoreId = verificationTokenStoreId;

    /**
     * Internal helper to perform HTTP requests using Nuxt 3's built-in ofetch ($fetch).
     * @param {string} path - API endpoint path.
     * @param {string} [method="GET"] - HTTP method.
     * @param {Object} [body] - Request payload.
     * @returns {Promise<Object>} Parsed JSON response.
     */
    const request = async (path, method = "GET", body) => {
      const url = `${_baseUrl}/api/v1${path}`;
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `token ${_apiKey}`,
      };
      // When using $fetch, it automatically serializes JSON if content-type is application/json.
      const options = { method, headers, body };
      try {
        return await $fetch(url, options);
      } catch (error) {
        // You can add additional error handling here if needed.
        throw error;
      }
    };

    /**
     * Wraps a document into the invoice payload format.
     * If the document is not already wrapped (i.e. doesn't have a `metadata` property),
     * it returns an object with `orderId` and `metadata`.
     * Expects the document to have an `id` property.
     * @param {Object} doc - The plain document value.
     * @returns {Object} Invoice payload.
     */
    const wrapPayload = (doc) =>
      doc && typeof doc === "object" && !doc.metadata
        ? { orderId: doc.id, metadata: doc }
        : doc;

    /**
     * Unwraps an invoice response.
     * Returns a plain document object that merges the stored metadata with the invoice’s
     * identifying orderId as `id` and includes the BTCPay internal invoice id as `btcpayId`.
     * @param {Object} invoice - The invoice object from BTCPay.
     * @returns {Object|null} The unwrapped document or null if invoice is falsy.
     */
    const unwrapInvoice = (invoice) =>
      invoice ? { id: invoice.orderId, ...invoice.metadata, btcpayId: invoice.id } : null;

    /**
     * Creates an invoice in the specified store.
     * @param {string} storeId - The store identifier.
     * @param {Object} doc - The document to create.
     * @returns {Promise<Object>} The created document (unwrapped).
     */
    const createInvoice = async (storeId, doc) => {
      const payload = wrapPayload(doc);
      const path = `/invoices?storeId=${encodeURIComponent(storeId)}`;
      const invoice = await request(path, "POST", payload);
      return unwrapInvoice(invoice);
    };

    /**
     * Retrieves an invoice using its orderId.
     * Filters out archived invoices.
     * @param {string} storeId - The store identifier.
     * @param {string} orderId - The orderId (used as the document id).
     * @returns {Promise<Object|null>} The unwrapped document or null if not found.
     */
    const getInvoiceByOrderId = async (storeId, orderId) => {
      const path = `/invoices?storeId=${encodeURIComponent(storeId)}&orderId=${encodeURIComponent(orderId)}`;
      const result = await request(path, "GET");
      if (Array.isArray(result)) {
        const activeInvoice = result.find((inv) => !inv.archived);
        return activeInvoice ? unwrapInvoice(activeInvoice) : null;
      }
      return null;
    };

    /**
     * Updates an invoice's metadata by orderId.
     * @param {string} storeId - The store identifier.
     * @param {string} orderId - The orderId (document id).
     * @param {Object} doc - The document data to update.
     * @returns {Promise<Object>} The updated document (unwrapped).
     */
    const updateInvoice = async (storeId, orderId, doc) => {
      const payload = wrapPayload(doc);
      const existingInvoice = await getInvoiceByOrderId(storeId, orderId);
      if (!existingInvoice) throw new Error("Invoice not found for update.");
      const btcpayInvoiceId = existingInvoice.btcpayId || existingInvoice.id;
      const path = `/invoices/${btcpayInvoiceId}?storeId=${encodeURIComponent(storeId)}`;
      const updatedInvoice = await request(path, "POST", payload);
      return unwrapInvoice(updatedInvoice);
    };

    /**
     * Archives an invoice (marks it as deleted) by orderId.
     * @param {string} storeId - The store identifier.
     * @param {string} orderId - The orderId (document id).
     * @returns {Promise<Object>} The archived invoice (unwrapped).
     */
    const archiveInvoice = async (storeId, orderId) => {
      const existingInvoice = await getInvoiceByOrderId(storeId, orderId);
      if (!existingInvoice) throw new Error("Invoice not found for archiving.");
      const btcpayInvoiceId = existingInvoice.btcpayId || existingInvoice.id;
      const path = `/invoices/${btcpayInvoiceId}/archive?storeId=${encodeURIComponent(storeId)}`;
      const archivedInvoice = await request(path, "POST");
      return unwrapInvoice(archivedInvoice);
    };

    /**
     * Lists invoices for the given store.
     * Filters out archived invoices.
     * @param {string} storeId - The store identifier.
     * @param {Object} [queryParams={}] - Additional query parameters.
     * @returns {Promise<Array>} An array of unwrapped documents.
     */
    const listInvoices = async (storeId, queryParams = {}) => {
      const qs = new URLSearchParams(queryParams);
      qs.append("storeId", storeId);
      const path = `/invoices?${qs.toString()}`;
      const result = await request(path, "GET");
      return Array.isArray(result)
        ? result.filter((inv) => !inv.archived).map((inv) => unwrapInvoice(inv))
        : [];
    };

    /**
     * Searches for an invoice by matching a metadata field.
     * @param {string} storeId - The store identifier.
     * @param {string} key - The metadata key.
     * @param {any} value - The value to match.
     * @returns {Promise<Object|null>} The matching unwrapped document or null if not found.
     */
    const findInvoiceByMetadata = async (storeId, key, value) => {
      const invoices = await listInvoices(storeId);
      const invoice = invoices.find((doc) => doc && doc[key] === value);
      return invoice || null;
    };

    /**
     * Archives all invoices in the specified store whose metadata field matches the given value.
     * @param {string} storeId - The store identifier.
     * @param {string} key - The metadata key.
     * @param {any} value - The value to match.
     * @returns {Promise<Array>} An array of results for each archived invoice (unwrapped).
     */
    const archiveInvoicesByMetadata = async (storeId, key, value) => {
      const invoices = await listInvoices(storeId);
      const matchingInvoices = invoices.filter((doc) => doc && doc[key] === value);
      const results = [];
      for (const doc of matchingInvoices) {
        const archived = await archiveInvoice(storeId, doc.id);
        results.push(archived);
      }
      return results;
    };

    /**
     * Returns an object with store-specific methods to interact with invoices.
     * This avoids needing to pass the storeId on every call.
     * @param {string} storeId - The store identifier.
     * @returns {object} An object containing methods bound to the given store.
     */
    const makeStoreMethods = (storeId) => ({
      createInvoice: async (doc) => await createInvoice(storeId, doc),
      getInvoiceByOrderId: async (orderId) => await getInvoiceByOrderId(storeId, orderId),
      updateInvoice: async (orderId, doc) => await updateInvoice(storeId, orderId, doc),
      archiveInvoice: async (orderId) => await archiveInvoice(storeId, orderId),
      listInvoices: async (queryParams = {}) => await listInvoices(storeId, queryParams),
      findInvoiceByMetadata: async (key, value) => await findInvoiceByMetadata(storeId, key, value),
      archiveInvoicesByMetadata: async (key, value) =>
        await archiveInvoicesByMetadata(storeId, key, value),
    });

    return {
      user: makeStoreMethods(_userStoreId),
      session: makeStoreMethods(_sessionStoreId),
      verificationToken: makeStoreMethods(_verificationTokenStoreId),
      // Optionally, expose the lower-level helper methods if needed.
      createInvoice,
      getInvoiceByOrderId,
      updateInvoice,
      archiveInvoice,
      listInvoices,
      findInvoiceByMetadata,
      archiveInvoicesByMetadata,
      wrapPayload,
      unwrapInvoice,
      request,
    };
  };

  nitroApp.BTCPayClient = BTCPayClient;
});

