SparseArray.prototype.getLength = getLength;
SparseArray.prototype.setLength = setLength;
SparseArray.prototype.getDefaultSize = getDefaultSize;
SparseArray.prototype.setDefaultSize = setDefaultSize;
SparseArray.prototype.getAxisOffset = getAxisOffset;
SparseArray.prototype.setAxisOffset = setAxisOffset;
SparseArray.prototype.getGap = getGap;
SparseArray.prototype.setGap = setGap;
SparseArray.prototype.getItemSize = getItemSize;
SparseArray.prototype.setItemSize = setItemSize;
SparseArray.prototype.insert = insert;
SparseArray.prototype.remove = remove;
SparseArray.prototype.start = start;
SparseArray.prototype.end = end;
SparseArray.prototype.indexOf = indexOf;
SparseArray.prototype.clear = clear;
SparseArray.prototype.toString = toString;

/**
 * A sparse array of sizes that represent items in a dimension.
 *
 * Provides efficient support for finding the cumulative distance to
 * the start/end of an item along the axis, and similarly for finding the
 * index of the item at a particular distance.
 *
 * Default size is used for items whose size hasn't been specified.
 */
function SparseArray(block_size) {

  if(block_size === undefined) {
    block_size = 128;
  }

  // Assumption: vector elements (sizes) will typically be set in
  // small ranges that reflect localized scrolling.  Allocate vector
  // elements in blocks of block_size, which must be a power of 2.
  // block_shift is the power of 2 and block_mask masks off as many
  // low order bits.  The block_table contains all of the allocated
  // blocks and has length/block_size elements which are allocated lazily.
  var pow = (Math.log(block_size) / Math.log(2)) | 0,
    size = Math.pow(2, pow),
    mask = size - 1;

  this.block_size  = size;
  this.block_shift = pow;
  this.block_mask  = mask;
  this.block_table = [];

  this._defaultSize = 0;
  this._axisOffset = 0;
  this._gap = 0;

  // Sorted Vector of intervals for the pending removes, in descending order,
  // for example [7, 5, 3, 1] for the removes at 7, 6, 5, 3, 2, 1
  this.removes = null;
  // Sorted Vector of intervals for the pending inserts, in ascending order,
  // for example [1, 3, 5, 7] for the inserts at 1, 2, 3, 5, 6, 7
  this.inserts = null;

  this._length = 0;
  // What the length will be after any pending changes are flushed.
  this._pendingLength = -1;
}

/**
 * The number of item size valued elements.
 *
 * @default 0
 */
function getLength() {
  return this._pendingLength === -1 ? this._length : this._pendingLength;
}

/**
 * @private
 * Grows or truncates the vector to be the specified newLength.
 * When truncating, releases empty blocks and sets to NaN any values
 * in the last block beyond the newLength.
 */
function setLength(newLength) {
  flushPendingChanges.call(this);

  if(newLength < this._length) {
    // Clear any remaining non-NaN values in the last block
    var blockIndex = newLength >> this.block_shift;
    var endIndex = Math.min(blockIndex * this.block_size + this.block_size, this._length) - 1;
    clearInterval.call(this, newLength, endIndex);
  }

  this._length = newLength;

  // update the table
  var partialBlock = ((this._length & this.block_mask) === 0) ? 0 : 1;
  this.block_table.length = (this._length >> this.block_shift) + partialBlock;
}

//----------------------------------
//  defaultSize
//----------------------------------

/**
 * The size of items whose size was not specified with setItemSize.
 *
 * @default 0
 */
function getDefaultSize() {
  return this._defaultSize;
}

/**
 * @private
 */
function setDefaultSize(value) {
  this._defaultSize = value;
}

//----------------------------------
//  axisOffset
//----------------------------------

/**
 * The offset of the first item from the origin in the majorAxis
 * direction. This is useful when implementing padding,
 * in addition to gaps, for virtual layouts.
 *
 * @see #gap
 */
function getAxisOffset() {
  return this._axisOffset;
}

/**
 * @private
 */
function setAxisOffset(value) {
  this._axisOffset = value;
}

//----------------------------------
//  gap
//----------------------------------

/**
 * The distance between items.
 *
 * @default 0
 */
function getGap() {
  return this._gap;
}

/**
 * @private
 */
function setGap(value) {
  this._gap = value;
}

//--------------------------------------------------------------------------
//
//  Methods
//
//--------------------------------------------------------------------------

/**
 * Return the size of the item at index.  If no size was ever
 * specified then then the defaultSize is returned.
 *
 * @param index The item's index.
 * @see defaultSize
 */
function getItemSize(index) {
  flushPendingChanges.call(this);

  var block = this.block_table[index >> this.block_shift];
  if(block) {
    var value = block.sizes[index & this.block_mask];
    return (value !== value) ? this._defaultSize : value;
  } else {
    return this._defaultSize;
  }
}

/**
 * Set the size of the item at index. If an index is
 * set to <code>NaN</code> then subsequent calls to get
 * will return the defaultSize.
 *
 * @param index The item's index.
 * @param value The item's size.
 * @see defaultSize
 */
function setItemSize(index, value) {
  flushPendingChanges.call(this);

  if(index >= this.getLength()) {
    throw new Error("Invalid index and all that.");
  }

  var blockIndex = index >> this.block_shift;
  var block = this.block_table[blockIndex];
  if(!block) {
    block = this.block_table[blockIndex] = new Block(this.block_size);
  }

  var sizesIndex = index & this.block_mask;
  var sizes = block.sizes;
  var oldValue = sizes[sizesIndex];
  if(oldValue === value) {
    return;
  }

  if(oldValue !== oldValue) {
    block.defaultCount -= 1;
    block.sizesSum += value;
  } else if(value !== value) {
    block.defaultCount += 1;
    block.sizesSum -= oldValue;
  } else {
    block.sizesSum += value - oldValue;
  }

  sizes[sizesIndex] = value;
}

/**
 * Make room for a new item at index by shifting all of the sizes
 * one position to the right, beginning with startIndex.
 *
 * The value at index will be NaN.
 *
 * This is similar to array.splice(index, 0, NaN).
 *
 * @param index The position of the new NaN size item.
 */
function insert(index) {
  // We don't support interleaved pending inserts and removes
  if(this.removes) {
    flushPendingChanges.call(this);
  }

  if(this.inserts) {
    // Update the last interval or add a new one?
    var lastIndex = this.inserts.length - 1;
    var intervalEnd = this.inserts[lastIndex];

    if(index === intervalEnd + 1) {
      // Extend the end of the interval
      this.inserts[lastIndex] = index;
    } else if(index > intervalEnd) {
      // New interval
      this.inserts.push(index);
      this.inserts.push(index);
    } else {
      // We can't support pending inserts that are not ascending
      flushPendingChanges.call(this);
    }
  }

  this._pendingLength = Math.max(this._length, index + 1);

  if(!this.inserts) {
    this.inserts = [];
    this.inserts.push(index);
    this.inserts.push(index);
  }
}

/**
 * Remove index by shifting all of the sizes one position to the left,
 * begining with index+1.
 *
 * This is similar to array.splice(index, 1).
 *
 * @param index The position to be removed.
 */
function remove(index) {
  // We don't support interleaved pending inserts and removes
  if(this.inserts) {
    flushPendingChanges.call(this);
  }

  // length getter takes into account pending inserts/removes but doesn't flush
  if(index >= this.getLength()) {
    throw new Error("Invalid index and all that.");
  }

  if(this.removes) {
    // Update the last interval or add a new one?
    var lastIndex = this.removes.length - 1;
    var intervalStart = this.removes[lastIndex];

    if(index === intervalStart - 1) {
      // Extend the start of the interval
      this.removes[lastIndex] = index;
    } else if(index < intervalStart) {
      // New interval
      this.removes.push(index);
      this.removes.push(index);
    } else {
      // We can't support pending removes that are not descending
      flushPendingChanges.call(this);
    }
  }

  this._pendingLength = (this._pendingLength === -1) ? length - 1 : this._pendingLength - 1;

  if(!this.removes) {
    this.removes = [];
    this.removes.push(index);
    this.removes.push(index);
  }
}

/**
 * @private
 * Returns true when all sizes in the specified interval for the block are NaN
 */
function isIntervalClear(block, index, count) {
  var sizes = block.sizes, size;
  for(count += index; index < count; ++index) {
    if((size = sizes[index]) === size) {
      return false;
    }
  }
  return true;
}

/**
 * @private
 * Copies elements between blocks. Indices relative to the blocks.
 * If srcBlock is null, then it fills the destination with NaNs.
 * The case of srcBlock === dstBlock is also supported.
 * The caller must ensure that count is within range.
 */
function inBlockCopy(dstBlock, dstIndexStart, srcBlock, srcIndexStart, count) {
  var ascending = dstIndexStart < srcIndexStart;

  var srcIndex = ascending ? srcIndexStart : srcIndexStart + count - 1;
  var dstIndex = ascending ? dstIndexStart : dstIndexStart + count - 1;
  var increment = ascending ? +1 : -1;

  var dstSizes = dstBlock.sizes;
  var srcSizes = srcBlock ? srcBlock.sizes : null;
  var dstValue = NaN;
  var srcValue = NaN;
  var sizesSumDelta = 0; // How much the destination sizesSum will change
  var defaultCountDelta = 0; // How much the destination defaultCount will change

  while(count > 0) {
    if(srcSizes) {
      srcValue = srcSizes[srcIndex];
    }

    dstValue = dstSizes[dstIndex];

    // Are the values different?
    if(srcValue !== dstValue) { // Triple '=' to handle NaN comparison

      // Are we removing a default size or a chached size?
      if(dstValue !== dstValue) {
        defaultCountDelta--;
      } else {
        sizesSumDelta -= dstValue;
      }

      // Are we adding a default size or a cached size?
      if(srcValue !== srcValue) {
        defaultCountDelta++;
      } else {
        sizesSumDelta += srcValue;
      }

      dstSizes[dstIndex] = srcValue;
    }

    srcIndex += increment;
    dstIndex += increment;
    count--;
  }

  dstBlock.sizesSum += sizesSumDelta;
  dstBlock.defaultCount += defaultCountDelta;
}

/**
 * @private
 * Copies 'count' elements from dstIndex to srcIndex.
 * Safe for overlapping source and destination intervals.
 * If any blocks are left full of NaNs, they will be deallcated.
 */
function copyInterval(dstIndex, srcIndex, count) {
  var ascending = dstIndex < srcIndex;
  if(!ascending) {
    dstIndex += count - 1;
    srcIndex += count - 1;
  }

  while(count > 0) {
    // Figure out destination block
    var dstBlockIndex = dstIndex >> this.block_shift;
    var dstSizesIndex = dstIndex & this.block_mask;
    var dstBlock = this.block_table[dstBlockIndex];

    // Figure out source block
    var srcBlockIndex = srcIndex >> this.block_shift;
    var srcSizesIndex = srcIndex & this.block_mask;
    var srcBlock = this.block_table[srcBlockIndex];

    // Figure out number of elements to copy
    var copyCount = ascending ?
      Math.min(this.block_size - dstSizesIndex, this.block_size - srcSizesIndex) :
    1 + Math.min(dstSizesIndex, srcSizesIndex);

    copyCount = Math.min(copyCount, count);

    // Figure out the start index for each block
    var dstStartIndex = ascending ? dstSizesIndex : dstSizesIndex - copyCount + 1;
    var srcStartIndex = ascending ? srcSizesIndex : srcSizesIndex - copyCount + 1;

    // Check whether a destination block needs to be allocated.
    // Allocate only if there are non-default values to be copied from the source.
    if(srcBlock && !dstBlock && isIntervalClear(srcBlock, srcStartIndex, copyCount)) {
      dstBlock = new Block(this.block_size);
      this.block_table[dstBlockIndex] = dstBlock;
    }

    // Copy to non-null dstBlock, srcBlock can be null
    if(dstBlock) {
      inBlockCopy(dstBlock, dstStartIndex, srcBlock, srcStartIndex, copyCount);

      // If this is the last time we're visiting this block, and it contains
      // only NaNs, then remove it
      if(dstBlock.defaultCount === this.block_size) {
        var blockEndReached = ascending ?
          (dstStartIndex + copyCount === this.block_size) :
          (dstStartIndex === 0);
        if(blockEndReached || count === copyCount)
          this.block_table[dstBlockIndex] = null;
      }
    }

    dstIndex += ascending ? copyCount : -copyCount;
    srcIndex += ascending ? copyCount : -copyCount;
    count -= copyCount;
  }
}

/**
 * @private
 * Sets all elements within the specified interval to NaN (both ends inclusive).
 * Releases empty blocks.
 */
function clearInterval(start, end) {
  while(start <= end) {
    // Figure our destination block
    var blockIndex = start >> this.block_shift;
    var sizesIndex = start & this.block_mask;
    var block = this.block_table[blockIndex];

    // Figure out number of elements to clear in this iteration
    // Make sure we don't clear more items than requested
    var clearCount = this.block_size - sizesIndex;
    clearCount = Math.min(clearCount, end - start + 1);

    if(block) {
      if(clearCount === this.block_size) {
        this.block_table[blockIndex] = null;
      } else {
        // Copying from null source block is equivalent of clearing the destination block
        inBlockCopy(block, sizesIndex, null /*srcBlock*/, 0, clearCount);

        // If the blockDst contains only default sizes, then remove the block
        if(block.defaultCount === this.block_size) {
          this.block_table[blockIndex] = null;
        }
      }
    }

    start += clearCount;
  }
}

/**
 * @private
 * Removes the elements designated by the intervals and truncates
 * the LinearLayoutVector to the new length.
 * 'intervals' is a Vector of descending intervals [7, 5, 3, 1]
 */
function removeIntervals(intervals) {
  var intervalsCount = intervals.length;
  if(intervalsCount === 0) {
    return;
  }

  // Adding final nextIntervalStart value (see below).
  intervals.reverse(); // turn into ascending, for example [7, 5, 3, 1] --> [1, 3, 5, 7]
  intervals.push(this.getLength());

  // Move the elements
  var dstStart = intervals[0];
  var srcStart;
  var count;
  var i = 0;
  do {
    var intervalEnd = intervals[i + 1];
    var nextIntervalStart = intervals[i + 2]
    i += 2;

    // Start copy from after the end of current interval
    srcStart = intervalEnd + 1;

    // copy all elements up to the start of the next interval.
    count = nextIntervalStart - srcStart;

    copyInterval.call(this, dstStart, srcStart, count);
    dstStart += count;
  } while(i < intervalsCount)

  // Truncate the excess elements.
  this.setLength(dstStart);
}

/**
 * @private
 * Increases the length and inserts NaN values for the elements designated by the intervals.
 * 'intervals' is a Vector of ascending intervals [1, 3, 5, 7]
 */
function insertIntervals(intervals, newLength) {
  var intervalsCount = intervals.length;
  if(intervalsCount === 0) {
    return;
  }

  // Allocate enough space for the insertions, all the elements
  // allocated are NaN by default.
  var oldLength = this.getLength();
  this.setLength(newLength);

  var srcEnd = oldLength - 1;
  var dstEnd = newLength - 1;
  var i = intervalsCount - 2;
  while(i >= 0) {
    // Find current interval
    var intervalStart = intervals[i];
    var intervalEnd = intervals[i + 1];
    i -= 2;

    // Start after the current interval
    var dstStart = intervalEnd + 1;
    var copyCount = dstEnd - dstStart + 1;
    var srcStart = srcEnd - copyCount + 1;

    copyInterval.call(this, dstStart, srcStart, copyCount);
    dstStart -= copyCount;
    dstEnd = intervalStart - 1;

    // Fill in with default NaN values after the copy
    clearInterval.call(this, intervalStart, intervalEnd);
  }
}

/**
 * @private
 * Processes any pending removes or pending inserts.
 */
function flushPendingChanges() {
  var intervals;
  if(this.removes) {
    intervals = this.removes;
    this.removes = null;
    this._pendingLength = -1;
    removeIntervals.call(this, intervals);
  } else if(this.inserts) {
    intervals = this.inserts;
    var newLength = this._pendingLength;
    this.inserts = null;
    this._pendingLength = -1;
    insertIntervals.call(this, intervals, newLength);
  }
}

/**
 * The cumulative distance to the start of the item at index, including
 * the gaps between items and the axisOffset.
 *
 * The value of start(0) is axisOffset.
 *
 * Equivalent to:
 * <pre>
 * var distance = this.getAxisOffset();
 * for (var i = 0; i &lt; index; i++)
 *     distance += get(i);
 * return distance + (gap * index);
 * </pre>
 *
 * The actual implementation is relatively efficient.
 *
 * @param index The item's index.
 * @see #end
 */
function start(index) {

  flushPendingChanges.call(this);

  if((this._length === 0) || (index === 0)) {
    return this.getAxisOffset();
  }

  if(index >= this._length) {
    throw new Error("Invalid index and all that.");
  }

  var distance = this.getAxisOffset();
  var blockIndex = index >> this.block_shift;
  for(var i = 0; i < blockIndex; i++)
  {
    var block = this.block_table[i];
    distance += block ?
    block.sizesSum + (block.defaultCount * this._defaultSize) :
    this.block_size * this._defaultSize;
  }
  var lastBlock = this.block_table[blockIndex];
  var lastBlockOffset = index & ~this.block_mask;
  var lastBlockLength = index - lastBlockOffset;
  if(lastBlock) {
    var sizes = lastBlock.sizes;
    for(i = 0; i < lastBlockLength; i++) {
      var size = sizes[i];
      distance += (size !== size) ? this._defaultSize : size;
    }
  } else {
    distance += this._defaultSize * lastBlockLength;
  }
  distance += index * this.getGap();
  return distance;
}

/**
 * The cumulative distance to the end of the item at index, including
 * the gaps between items.
 *
 * If <code>index &lt;(length-1)</code> then the value of this
 * function is defined as:
 * <code>start(index) + get(index)</code>.
 *
 * @param index The item's index.
 * @see #start
 */
function end(index) {
  flushPendingChanges.call(this);
  return this.start(index) + this.getItemSize(index);
}

/**
 * Returns the index of the item that overlaps the specified distance.
 *
 * The item at index <code>i</code> overlaps a distance value
 * if <code>start(i) &lt;= distance &lt; end(i)</code>.
 *
 * If no such item exists, -1 is returned.
 */
function indexOf(distance) {
  flushPendingChanges.call(this);
  var index = indexOfInternal.call(this, distance);
  return (index >= this._length) ? -1 : index;
}

function indexOfInternal(distance) {

  if((this._length === 0) || (distance < 0)) {
    return -1;
  }

  // The area of the first item includes the axisOffset
  var curDistance = this.getAxisOffset();

  if(distance < curDistance) {
    return 0;
  }

  var index = -1,
    block = null,
    blockSize = this.block_size,
    defaultSize = this._defaultSize,
    gap = this.getGap(),
    blockGap = gap * blockSize;

  // Find the block that contains distance and the index of its
  // first element
  var blockIndex = -1,
    blockTable = this.block_table,
    blockTableLength = blockTable.length;

  for(; ++blockIndex < blockTableLength;) {
    block = blockTable[blockIndex];
    var blockDistance = blockGap + (
        block ?
        block.sizesSum + (block.defaultCount * defaultSize) :
        blockSize * defaultSize
      );

    if((distance === curDistance) || ((distance >= curDistance) && (distance < (curDistance + blockDistance)))) {
      index = blockIndex << this.block_shift;
      break;
    }
    curDistance += blockDistance;
  }

  if((index === -1) || (distance === curDistance)) {
    return index;
  }

  // At this point index corresponds to the first item in this block
  if(block) {
    // Find the item that contains distance and return its index
    var sizes = block.sizes,
      n = this.block_size - 1;
    for(var i = 0; i < n; i++) {
      var size = sizes[i];
      curDistance += gap + (size !== size ? this._defaultSize : size);
      if(curDistance > distance) {
        return index + i;
      }
    }
    // TBD special-case for the very last index
    return index + this.block_size - 1;
  } else {
    return index + Math.floor(Number(distance - curDistance) / Number(this._defaultSize + gap));
  }
}

/**
 * Clear all cached state, reset length to zero.
 */
function clear() {
  // Discard any pending changes, before setting the length
  // otherwise the length setter will commit the changes.
  this.removes = null;
  this.inserts = null;
  this._pendingLength = -1;

  this.setLength(0); // clears the this.block_table as well
}

function toString() {
  return "SparseArray {" +
    "length: " + this._length + ", " +
    "size: " + this.end(this.getLength() -1) + ", " +
    "[blocks: " + this.block_table.length + "]" + ", " +
    "gap: " + this._gap + ", " +
    "defaultSize: " + this._defaultSize + ", " +
    "pendingRemoves: " + (this.removes ? this.removes.length : 0) + ", " +
    "pendingInserts: " + (this.inserts ? this.inserts.length : 0) +
    "}";
}

/**
 * @private
 * A SparseArray block of layout element heights or widths.
 *
 * Total "distance" for a Block is: sizesSum + (defaultCount * distanceVector.default).
 */
function Block(block_size) {

  this.sizes = new Array(block_size);
  this.sizesSum = 0;
  this.defaultCount = block_size;

  for(var i = -1; ++i < block_size;) {
    this.sizes[i] = NaN;
  }
}
