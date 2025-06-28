export type UserType = {
  id: string;
  name: string;
  email: string;
  generations: number;
  virtualbox: VirtualBoxType[];
  usersToVirtualboxes: UsersToVirtualBoxesType[];
};

export type VirtualBoxType = {
  id: string;
  name: string;
  type: "react" | "node";
  visibility: "public" | "private";
  userId: string;
  usersToVirtualboxes: UsersToVirtualBoxesType[];
};

export type UsersToVirtualBoxesType = {
  userId: string;
  virtualboxId: string;
};

export type R2FilesType = {
  objects: R2FileDataType[];
  truncated: boolean;
  delimitedPrefixes: any[];
};

export type R2FileDataType = {
  storageClass: string;
  uploaded: string;
  checkSums: any;
  httpEtag: string;
  etag: string;
  size: number;
  version: string;
  key: string;
};

export type TFolder = {
    id: string
    type: "folder"
    name: string
    fullPath: string; 
    children: (TFolder | TFile)[]
}

export type TFile = {
    id: string
    type: "file"
    name: string
    fullPath: string; 
}