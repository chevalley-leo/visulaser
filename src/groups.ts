import type { LaserObject } from "./types";

export interface ObjectGroup {
  groupId: string;
  groupName: string;
  members: LaserObject[];
}

// Consecutive objects sharing a groupId (set by multi-object generators, see
// shapes.ts:tagGroup) become one group; anything else is its own group of one.
export function groupObjects(objects: LaserObject[]): ObjectGroup[] {
  const groups: ObjectGroup[] = [];
  for (const obj of objects) {
    const last = groups[groups.length - 1];
    if (obj.groupId && last?.groupId === obj.groupId) {
      last.members.push(obj);
    } else {
      groups.push({ groupId: obj.groupId ?? obj.id, groupName: obj.groupName ?? obj.name, members: [obj] });
    }
  }
  return groups;
}
