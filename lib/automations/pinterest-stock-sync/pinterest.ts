/**
 * Pinterest API Integration
 * Handles pin creation and management
 */

export interface PinterestPinParams {
  board: string;
  title: string;
  description: string;
  image_url: string;
  link: string;
}

export interface PinterestPin {
  id: string;
  link: string;
  note: string;
  media: {
    type: string;
    original: {
      url: string;
    };
  };
}

/**
 * Create a pin on Pinterest
 * Note: This uses Pinterest API v5
 * Requires PINTEREST_ACCESS_TOKEN environment variable
 */
export async function createPinterestPin(
  params: PinterestPinParams
): Promise<PinterestPin> {
  const accessToken = process.env.PINTEREST_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('PINTEREST_ACCESS_TOKEN environment variable is required');
  }

  // First, get or create the board
  const boardId = await getOrCreateBoard(params.board, accessToken);

  // Create the pin
  const url = 'https://api.pinterest.com/v5/pins';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      board_id: boardId,
      media_source: {
        source_type: 'image_url',
        url: params.image_url,
      },
      link: params.link,
      title: params.title,
      description: params.description,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Pinterest pin: ${error}`);
  }

  return response.json();
}

/**
 * Get or create a Pinterest board
 */
async function getOrCreateBoard(
  boardName: string,
  accessToken: string
): Promise<string> {
  // First, try to find existing board
  const boards = await getBoards(accessToken);
  const existingBoard = boards.find(
    (b: any) => b.name.toLowerCase() === boardName.toLowerCase()
  );

  if (existingBoard) {
    return existingBoard.id;
  }

  // Create new board if not found
  const url = 'https://api.pinterest.com/v5/boards';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: boardName,
      privacy: 'PUBLIC', // or 'SECRET' for private boards
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Pinterest board: ${error}`);
  }

  const board = await response.json();
  return board.id;
}

/**
 * Get all boards for the authenticated user
 */
async function getBoards(accessToken: string): Promise<any[]> {
  const url = 'https://api.pinterest.com/v5/boards';
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Pinterest boards');
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Update a pin (when product comes back in stock)
 */
export async function updatePinterestPin(
  pinId: string,
  updates: { description?: string; link?: string }
): Promise<PinterestPin> {
  const accessToken = process.env.PINTEREST_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('PINTEREST_ACCESS_TOKEN environment variable is required');
  }

  const url = `https://api.pinterest.com/v5/pins/${pinId}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update Pinterest pin: ${error}`);
  }

  return response.json();
}

/**
 * Delete a pin
 */
export async function deletePinterestPin(pinId: string): Promise<void> {
  const accessToken = process.env.PINTEREST_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('PINTEREST_ACCESS_TOKEN environment variable is required');
  }

  const url = `https://api.pinterest.com/v5/pins/${pinId}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete Pinterest pin: ${error}`);
  }
}

