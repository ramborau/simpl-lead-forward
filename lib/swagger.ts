import swaggerJSDoc from 'swagger-jsdoc'

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Lead Forwarder API',
    version: '2.0.0',
    description: 'API for forwarding Facebook leads to external webhooks',
    contact: {
      name: 'API Support',
      url: 'https://github.com/ramborau/simpl-lead-forward',
      email: 'support@example.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'https://simple-lead-forwarder-umtbo.ondigitalocean.app',
      description: 'Production server'
    },
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    }
  ],
  components: {
    schemas: {
      FormConfig: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Facebook form ID'
          },
          name: {
            type: 'string', 
            description: 'Human-readable form name'
          }
        },
        required: ['id', 'name']
      },
      LeadFields: {
        type: 'object',
        description: 'Dynamic object containing lead form field values',
        additionalProperties: {
          type: 'string'
        },
        example: {
          full_name: 'John Doe',
          email: 'john@example.com',
          phone_number: '+1234567890',
          company: 'Acme Corp'
        }
      },
      Lead: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Facebook lead ID'
          },
          form_id: {
            type: 'string',
            description: 'Facebook form ID'
          },
          form_name: {
            type: 'string',
            description: 'Human-readable form name'
          },
          page_id: {
            type: 'string',
            description: 'Facebook page ID'
          },
          page_name: {
            type: 'string',
            description: 'Facebook page name'
          },
          created_time: {
            type: 'string',
            format: 'date-time',
            description: 'Lead creation timestamp'
          },
          fields: {
            $ref: '#/components/schemas/LeadFields'
          },
          raw_data: {
            type: 'object',
            description: 'Complete Facebook API response'
          }
        },
        required: ['id', 'form_id', 'page_id', 'created_time', 'fields']
      },
      WebhookPayload: {
        type: 'object',
        properties: {
          event: {
            type: 'string',
            enum: ['lead.received'],
            description: 'Event type'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Event timestamp'
          },
          lead: {
            $ref: '#/components/schemas/Lead'
          }
        },
        required: ['event', 'timestamp', 'lead']
      },
      DebugEntry: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Debug entry ID'
          },
          type: {
            type: 'string',
            enum: ['webhook_received', 'lead_processed', 'webhook_forwarded', 'error'],
            description: 'Debug entry type'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Debug entry timestamp'
          },
          success: {
            type: 'boolean',
            description: 'Whether the operation was successful'
          },
          error: {
            type: 'string',
            description: 'Error message if operation failed'
          },
          data: {
            type: 'object',
            description: 'Operation-specific data'
          }
        },
        required: ['id', 'type', 'timestamp', 'data']
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message'
          },
          details: {
            type: 'string',
            description: 'Additional error details'
          }
        },
        required: ['error']
      }
    },
    responses: {
      BadRequest: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      Forbidden: {
        description: 'Forbidden - Invalid signature or verification token',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      NotFound: {
        description: 'Not Found - Configuration not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      InternalError: {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      }
    }
  },
  paths: {
    '/api/facebook/connect': {
      post: {
        tags: ['Facebook Integration'],
        summary: 'Initiate Facebook OAuth flow',
        description: 'Starts the Facebook OAuth process for page connection',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  webhookUrl: {
                    type: 'string',
                    format: 'uri',
                    description: 'Your webhook endpoint URL'
                  }
                },
                required: ['webhookUrl']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'OAuth URL generated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    authUrl: {
                      type: 'string',
                      format: 'uri',
                      description: 'Facebook OAuth URL'
                    }
                  }
                }
              }
            }
          },
          '400': {
            $ref: '#/components/responses/BadRequest'
          },
          '500': {
            $ref: '#/components/responses/InternalError'
          }
        }
      }
    },
    '/api/facebook/callback': {
      get: {
        tags: ['Facebook Integration'],
        summary: 'Facebook OAuth callback',
        description: 'Handles Facebook OAuth callback and redirects to page selection',
        parameters: [
          {
            name: 'code',
            in: 'query',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Facebook OAuth authorization code'
          },
          {
            name: 'state',
            in: 'query',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Encoded webhook URL'
          },
          {
            name: 'error',
            in: 'query',
            required: false,
            schema: {
              type: 'string'
            },
            description: 'OAuth error code'
          }
        ],
        responses: {
          '302': {
            description: 'Redirect to page selection'
          },
          '400': {
            description: 'OAuth error or missing parameters'
          }
        }
      }
    },
    '/api/facebook/subscribe': {
      post: {
        tags: ['Configuration'],
        summary: 'Subscribe page and forms to webhooks',
        description: 'Configures Facebook page and lead forms for webhook forwarding',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  pageId: {
                    type: 'string',
                    description: 'Facebook page ID'
                  },
                  pageName: {
                    type: 'string',
                    description: 'Facebook page name'
                  },
                  pageAccessToken: {
                    type: 'string',
                    description: 'Facebook page access token'
                  },
                  forms: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/FormConfig'
                    },
                    description: 'Array of lead forms to monitor'
                  },
                  webhookUrl: {
                    type: 'string',
                    format: 'uri',
                    description: 'Your webhook endpoint URL'
                  }
                },
                required: ['pageId', 'pageName', 'pageAccessToken', 'forms', 'webhookUrl']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Successfully subscribed to webhooks',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean'
                    },
                    message: {
                      type: 'string'
                    }
                  }
                }
              }
            }
          },
          '400': {
            $ref: '#/components/responses/BadRequest'
          },
          '500': {
            $ref: '#/components/responses/InternalError'
          }
        }
      }
    },
    '/api/webhooks/facebook': {
      post: {
        tags: ['Webhooks'],
        summary: 'Receive Facebook lead webhooks',
        description: 'Processes Facebook lead generation webhooks and forwards to configured endpoint',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  entry: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          description: 'Facebook page ID'
                        },
                        time: {
                          type: 'integer',
                          description: 'Timestamp'
                        },
                        changes: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              value: {
                                type: 'object',
                                properties: {
                                  leadgen_id: {
                                    type: 'string'
                                  },
                                  form_id: {
                                    type: 'string'
                                  },
                                  created_time: {
                                    type: 'integer'
                                  }
                                }
                              },
                              field: {
                                type: 'string',
                                enum: ['leadgen']
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Webhook processed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean'
                    }
                  }
                }
              }
            }
          },
          '403': {
            $ref: '#/components/responses/Forbidden'
          },
          '404': {
            $ref: '#/components/responses/NotFound'
          },
          '500': {
            $ref: '#/components/responses/InternalError'
          }
        }
      },
      get: {
        tags: ['Webhooks'],
        summary: 'Facebook webhook verification',
        description: 'Verifies Facebook webhook subscription',
        parameters: [
          {
            name: 'hub.mode',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              enum: ['subscribe']
            }
          },
          {
            name: 'hub.verify_token',
            in: 'query',
            required: true,
            schema: {
              type: 'string'
            }
          },
          {
            name: 'hub.challenge',
            in: 'query',
            required: true,
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Verification successful',
            content: {
              'text/plain': {
                schema: {
                  type: 'string'
                }
              }
            }
          },
          '403': {
            $ref: '#/components/responses/Forbidden'
          }
        }
      }
    },
    '/api/debug': {
      get: {
        tags: ['Debug'],
        summary: 'Get debug data',
        description: 'Retrieves debug information for troubleshooting',
        responses: {
          '200': {
            description: 'Debug data retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    debug_data: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/DebugEntry'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Debug'],
        summary: 'Log debug data',
        description: 'Logs debug information (internal use)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['webhook_received', 'lead_processed', 'webhook_forwarded', 'error']
                  },
                  data: {
                    type: 'object'
                  },
                  success: {
                    type: 'boolean'
                  },
                  error: {
                    type: 'string'
                  }
                },
                required: ['type', 'data']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Debug data logged successfully'
          }
        }
      },
      delete: {
        tags: ['Debug'],
        summary: 'Clear debug data',
        description: 'Clears all debug information',
        responses: {
          '200': {
            description: 'Debug data cleared successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean'
                    },
                    message: {
                      type: 'string'
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

const options = {
  definition: swaggerDefinition,
  apis: ['./app/api/**/*.ts'] // Path to the API files
}

export const swaggerSpec = swaggerJSDoc(options)