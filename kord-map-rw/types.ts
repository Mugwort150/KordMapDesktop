model Marker {
  id          String   @id @default(cuid())
  title       String
  description String?
  xCoord      Float    // X position on the map
  yCoord      Float    // Y position on the map
  floor       Int      // e.g., 1, 2, 3 representing the layer
  imageUrl    String?  // URL from Vercel Blob
  createdAt   DateTime @default(now())
  userId      String   // ID of the user who created it
}