export function validateResultV2(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) errors.push('result must be an object');
  if (value?.schemaVersion !== 'task-delegate.result.v2') errors.push('schemaVersion must equal task-delegate.result.v2');
  for (const key of ['status', 'target', 'mode', 'reviewRequired', 'commitAllowed']) if (!(key in (value || {}))) errors.push(`missing ${key}`);
  if (value?.reviewRequired !== true) errors.push('reviewRequired must be true');
  if (value?.commitAllowed !== false) errors.push('commitAllowed must be false');
  if (value?.changedFiles && !Array.isArray(value.changedFiles)) errors.push('changedFiles must be an array');
  return { valid: errors.length === 0, errors };
}
