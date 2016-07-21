// 存放转换后的标记对象
var flagsCache = {};

// 将字符串格式的标记转换为对象格式的标记，并将转换结果缓存至flagsCache中
function createFlags( flags ) {
    var object = flagsCache[ flags ] = {}, // object与flagsCache[ flags ]同时指向一个空对象，object添加属性时同时也往flagsCache[ flags ]中添加属性
        i, length;
    flags = flags.split( /\s+/ ); // 通过空白符把字符串标记分割成数组
    for ( i = 0, length = flags.length; i < length; i++ ) {
        object[ flags[i] ] = true;
    }
    return object;
}


/**
 * flags: 可选，用于改变回调函数列表的行为
 * 1.如果省略该参数，则类似于事件监听函数，可以触发多次
 * 2.该参数可选值有once、memory、unique及stopOnFalse，可以是单个或多个组合一起，不同值之间用空格隔开
 *     once: 确保回调函数列表只能触发一次
 *     memory: 记录上一次触发回调函数列表时的参数，之后添加的任何回调函数都将用记录的参数值立即调用
 *     unique: 确保回调函数列表没有重复值，每个函数只能被添加一次
 *     stopOnFalse: 当某个回调函数返回false时中断执行
 */
jQuery.Callbacks = function( flags ) {

    // 将字符串flags转发为对象flags
    flags = flags ? ( flagsCache[ flags ] || createFlags( flags ) ) : {};

    var list = [], // 存放回调函数的数组
        // Stack of fire calls for repeatable lists
        stack = [],
        // Last fire value (for non-forgettable lists)
        memory,
        firing, // 回调函数列表是否正在执行中
        firingStart, // 待执行的第一个回调函数的下标
        firingLength, // 待执行的最后一个回调函数的下标
        firingIndex, // 当前正在执行的回调函数的下标
        add = function( args ) {
            var i,
                length,
                elem,
                type,
                actual;
            for ( i = 0, length = args.length; i < length; i++ ) {
                elem = args[ i ];
                type = jQuery.type( elem );
                if ( type === "array" ) {
                    // Inspect recursively
                    add( elem );
                } else if ( type === "function" ) {
                    // Add if not in unique mode and callback is not in
                    if ( !flags.unique || !self.has( elem ) ) {
                        list.push( elem );
                    }
                }
            }
        },
        // Fire callbacks
        fire = function( context, args ) {
            args = args || [];
            memory = !flags.memory || [ context, args ];
            firing = true; 
            firingIndex = firingStart || 0;
            firingStart = 0;
            firingLength = list.length;
            for ( ; list && firingIndex < firingLength; firingIndex++ ) {
                if ( list[ firingIndex ].apply( context, args ) === false && flags.stopOnFalse ) {
                    memory = true; // Mark as halted
                    break;
                }
            }
            firing = false;
            if ( list ) {
                if ( !flags.once ) {
                    if ( stack && stack.length ) {
                        memory = stack.shift();
                        self.fireWith( memory[ 0 ], memory[ 1 ] );
                    }
                } else if ( memory === true ) {
                    self.disable();
                } else {
                    list = [];
                }
            }
        },
        // Actual Callbacks object
        self = {
            // 添加一个或一组回调函数至回调函数列表
            add: function() {
                if ( list ) { // 空数组或空对象均转换为true
                    var length = list.length; // 备份原回调函数列表的长度
                    add( arguments );
                    if ( firing ) { // 如果回调函数列表正在执行
                        firingLength = list.length; // 修改最后一个待执行的回调函数的下标，确保新添加的回调函数也能执行
                    } else if ( memory && memory !== true ) { // 在memory模式下，如果回调函数列表尚未在执行中且已经被触发过
                        firingStart = length;  // 修改第一个待执行的回调函数的下标为当前回调函数插入的位置
                        fire( memory[ 0 ], memory[ 1 ] ); // 立即执行新添加的回调函数，如果是在memory + stopOnFalse模式下，且某个回调函数的返回值是false, 则不会执行
                    }
                }
                return this;
            },
            // Remove a callback from the list
            remove: function() {
                if ( list ) {
                    var args = arguments,
                        argIndex = 0,
                        argLength = args.length;
                    for ( ; argIndex < argLength ; argIndex++ ) {
                        for ( var i = 0; i < list.length; i++ ) {
                            if ( args[ argIndex ] === list[ i ] ) {
                                // Handle firingIndex and firingLength
                                if ( firing ) {
                                    if ( i <= firingLength ) {
                                        firingLength--;
                                        if ( i <= firingIndex ) {
                                            firingIndex--;
                                        }
                                    }
                                }
                                // Remove the element
                                list.splice( i--, 1 );
                                // If we have some unicity property then
                                // we only need to do this once
                                if ( flags.unique ) {
                                    break;
                                }
                            }
                        }
                    }
                }
                return this;
            },
            // Control if a given callback is in the list
            has: function( fn ) {
                if ( list ) {
                    var i = 0,
                        length = list.length;
                    for ( ; i < length; i++ ) {
                        if ( fn === list[ i ] ) {
                            return true;
                        }
                    }
                }
                return false;
            },
            // Remove all callbacks from the list
            empty: function() {
                list = [];
                return this;
            },
            // Have the list do nothing anymore
            disable: function() {
                list = stack = memory = undefined;
                return this;
            },
            // Is it disabled?
            disabled: function() {
                return !list;
            },
            // Lock the list in its current state
            lock: function() {
                stack = undefined;
                if ( !memory || memory === true ) {
                    self.disable();
                }
                return this;
            },
            // Is it locked?
            locked: function() {
                return !stack;
            },
            // Call all callbacks with the given context and arguments
            fireWith: function( context, args ) {
                if ( stack ) {
                    if ( firing ) {
                        if ( !flags.once ) {
                            stack.push( [ context, args ] );
                        }
                    } else if ( !( flags.once && memory ) ) {
                        fire( context, args );
                    }
                }
                return this;
            },
            // Call all the callbacks with the given arguments
            fire: function() {
                self.fireWith( this, arguments );
                return this;
            },
            // To know if the callbacks have already been called at least once
            fired: function() {
                return !!memory;
            }
        };

    return self;
};