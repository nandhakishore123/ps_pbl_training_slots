// Designated inventory BUYING approvers, by user_id — used for FRONTEND box
// gating only. The backend service (inventory.services.js) is authoritative.
// Keep these in sync with the backend constants.
// TODO: replace with real faculty user_ids when provided
export const PROJECT_APPROVER_ID = 117;
export const TRAINING_APPROVER_ID = 119;

export const isInventoryApprover = (userId) =>
  Number(userId) === PROJECT_APPROVER_ID || Number(userId) === TRAINING_APPROVER_ID;
